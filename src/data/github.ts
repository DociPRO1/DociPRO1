/**
 * Data acquisition. Build-time only: the README never calls an API.
 *
 * Contribution calendar, in order of preference:
 *   1. GraphQL contributionsCollection (needs a token; GITHUB_TOKEN in Actions works)
 *   2. The public contributions fragment github.com/users/<login>/contributions
 *      (no token; used for local builds)
 *   3. The committed snapshot in data/github.json
 *
 * Public repositories: REST /users/<login>/repos, falling back to the snapshot.
 *
 * A failed source never fails the build. It falls back to the cache and logs
 * a warning, so a GitHub outage cannot blank the profile.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { request, token, RateLimitError } from './http.ts';
import type { CalendarDay, RepoInfo, Snapshot } from '../types.ts';

const API = 'https://api.github.com';

const warn = (msg: string) => console.warn(`  ! ${msg}`);

async function calendarGraphQL(login: string): Promise<CalendarDay[]> {
  const query = `query($login:String!){user(login:$login){contributionsCollection{contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;
  const res = await request(`${API}/graphql`, { method: 'POST', body: { query, variables: { login } } });
  const json = (await res.json()) as {
    data?: { user?: { contributionsCollection: { contributionCalendar: { weeks: { contributionDays: { date: string; contributionCount: number }[] }[] } } } };
    errors?: { message: string }[];
  };
  if (json.errors?.length) throw new Error(`GraphQL: ${json.errors.map((e) => e.message).join('; ')}`);
  const weeks = json.data?.user?.contributionsCollection.contributionCalendar.weeks;
  if (!weeks) throw new Error('GraphQL: user not found');
  return weeks.flatMap((w) => w.contributionDays.map((d) => ({ date: d.date, count: d.contributionCount })));
}

/**
 * Parses the server-rendered contribution graph. Each day cell carries
 * data-date and an id; the exact count lives in a <tool-tip for="id">.
 */
export function parseContributionHTML(html: string): CalendarDay[] {
  const counts = new Map<string, number>();
  for (const m of html.matchAll(/<tool-tip[^>]*\bfor="([^"]+)"[^>]*>([^<]*)<\/tool-tip>/g)) {
    const text = m[2]!.trim();
    const n = /^(\d[\d,]*) contribution/.exec(text);
    counts.set(m[1]!, n ? Number(n[1]!.replace(/,/g, '')) : 0);
  }
  const days: CalendarDay[] = [];
  for (const m of html.matchAll(/<td[^>]*\bdata-date="(\d{4}-\d{2}-\d{2})"[^>]*>/g)) {
    const tag = m[0];
    const id = /\bid="([^"]+)"/.exec(tag)?.[1];
    if (!id) continue;
    days.push({ date: m[1]!, count: counts.get(id) ?? 0 });
  }
  if (days.length < 300) throw new Error(`contributions page: parsed only ${days.length} days`);
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

async function calendarHTML(login: string): Promise<CalendarDay[]> {
  const res = await request(`https://github.com/users/${encodeURIComponent(login)}/contributions`, {
    accept: 'text/html',
    auth: false,
  });
  return parseContributionHTML(await res.text());
}

async function repos(login: string): Promise<RepoInfo[]> {
  const res = await request(`${API}/users/${encodeURIComponent(login)}/repos?type=owner&sort=pushed&per_page=100`);
  const list = (await res.json()) as Array<{
    full_name: string;
    name: string;
    description: string | null;
    html_url: string;
    homepage: string | null;
    language: string | null;
    topics?: string[];
    stargazers_count: number;
    forks_count: number;
    pushed_at: string;
    fork: boolean;
    archived: boolean;
    private: boolean;
  }>;
  return list
    .filter((r) => !r.private)
    .map((r) => ({
      fullName: r.full_name,
      name: r.name,
      description: r.description,
      url: r.html_url,
      homepage: r.homepage || null,
      language: r.language,
      topics: r.topics ?? [],
      stars: r.stargazers_count,
      forks: r.forks_count,
      pushedAt: r.pushed_at,
      isFork: r.fork,
      isArchived: r.archived,
    }));
}

export function readSnapshot(path: string): Snapshot | null {
  if (!existsSync(path)) return null;
  try {
    const s = JSON.parse(readFileSync(path, 'utf8')) as Snapshot;
    return s.version === 1 ? s : null;
  } catch {
    return null;
  }
}

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Fetches fresh data, merges with the cache on failure, and writes the
 * snapshot. `updated` only advances when the payload actually changed, so
 * an unchanged day produces a byte-identical snapshot and no commit.
 */
export async function refresh(login: string, path: string, offline = false): Promise<Snapshot> {
  const cached = readSnapshot(path);
  const usable = cached && cached.login === login ? cached : null;

  let calendar: CalendarDay[] | null = null;
  let calSource: Snapshot['source']['calendar'] = 'none';
  let repoList: RepoInfo[] | null = null;
  let repoSource: Snapshot['source']['repos'] = 'none';

  if (!offline) {
    if (token()) {
      try {
        calendar = await calendarGraphQL(login);
        calSource = 'graphql';
      } catch (e) {
        warn(`GraphQL calendar failed: ${(e as Error).message}`);
      }
    }
    if (!calendar) {
      try {
        calendar = await calendarHTML(login);
        calSource = 'html';
      } catch (e) {
        warn(`HTML calendar failed: ${(e as Error).message}`);
      }
    }
    try {
      repoList = await repos(login);
      repoSource = 'rest';
    } catch (e) {
      warn(`Repositories failed: ${(e as Error).message}${e instanceof RateLimitError ? '' : ''}`);
    }
  }

  if (!calendar && usable?.calendar.length) {
    calendar = usable.calendar;
    calSource = 'cache';
  }
  if (!repoList && usable) {
    repoList = usable.repos;
    repoSource = 'cache';
  }

  const payload = { calendar: calendar ?? [], repos: repoList ?? [] };
  const changed = !usable || JSON.stringify({ calendar: usable.calendar, repos: usable.repos }) !== JSON.stringify(payload);

  const snapshot: Snapshot = {
    version: 1,
    login,
    updated: changed ? today() : usable!.updated,
    // Source is recorded only when data changed; otherwise keep the file stable.
    source: changed ? { calendar: calSource, repos: repoSource } : usable!.source,
    ...payload,
  };

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(snapshot, null, 1) + '\n');
  return snapshot;
}
