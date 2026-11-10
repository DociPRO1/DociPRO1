import type { CalendarDay, RepoInfo, ProfileConfig } from '../types.ts';

export interface ActivityStats {
  days: CalendarDay[];
  total: number;
  activeDays: number;
  longestStreak: number;
  currentStreak: number;
  weeks: { start: string; total: number }[];
  peakWeek: { start: string; total: number } | null;
  /** Totals by weekday, Monday first. */
  weekday: number[];
  first: string | null;
  last: string | null;
}

const DAY = 86_400_000;
const parse = (d: string) => Date.parse(`${d}T00:00:00Z`);
const fmt = (t: number) => new Date(t).toISOString().slice(0, 10);

export function activity(calendar: CalendarDay[], asOf = new Date()): ActivityStats {
  // GitHub's calendar can include future days of the current week; drop them.
  const cutoff = fmt(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate()));
  // Exactly the last 365 days, ending today.
  const days = calendar
    .filter((d) => d.date <= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-365);

  let total = 0;
  let activeDays = 0;
  let longest = 0;
  let run = 0;
  const weekday = [0, 0, 0, 0, 0, 0, 0];
  for (const d of days) {
    total += d.count;
    if (d.count > 0) {
      activeDays++;
      run++;
      longest = Math.max(longest, run);
    } else run = 0;
    const wd = (new Date(parse(d.date)).getUTCDay() + 6) % 7;
    weekday[wd]! += d.count;
  }

  // Current streak: today may still be empty without breaking it.
  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i]!.count > 0) current++;
    else if (i === days.length - 1) continue;
    else break;
  }

  // Weeks aligned to Monday.
  const weekMap = new Map<string, number>();
  for (const d of days) {
    const t = parse(d.date);
    const wd = (new Date(t).getUTCDay() + 6) % 7;
    const start = fmt(t - wd * DAY);
    weekMap.set(start, (weekMap.get(start) ?? 0) + d.count);
  }
  const weeks = Array.from(weekMap, ([start, total]) => ({ start, total })).sort((a, b) => a.start.localeCompare(b.start));
  const peakWeek = weeks.reduce<ActivityStats['peakWeek']>((p, w) => (!p || w.total > p.total ? w : p), null);

  return {
    days,
    total,
    activeDays,
    longestStreak: longest,
    currentStreak: current,
    weeks,
    peakWeek: peakWeek && peakWeek.total > 0 ? peakWeek : null,
    weekday,
    first: days[0]?.date ?? null,
    last: days.at(-1)?.date ?? null,
  };
}

/**
 * Chooses featured repositories: pinned slugs first, then (if enabled) the
 * best remaining public, non-fork, non-archived repositories ranked by stars
 * and recency. The profile repository itself is never featured.
 */
export function featured(config: ProfileConfig, repos: RepoInfo[]): RepoInfo[] {
  const lc = (s: string) => s.toLowerCase();
  const excluded = new Set([...config.projects.exclude.map(lc), lc(`${config.login}/${config.login}`)]);
  const byName = new Map(repos.map((r) => [lc(r.fullName), r]));
  const out: RepoInfo[] = [];
  for (const slug of config.projects.featured) {
    const r = byName.get(lc(slug));
    if (r && !excluded.has(lc(r.fullName))) out.push(r);
    else console.warn(`  ! featured repository not found or not public: ${slug}`);
  }
  if (config.projects.auto) {
    const now = Date.now();
    const score = (r: RepoInfo) => r.stars * 3 + r.forks * 2 + Math.max(0, 365 - (now - Date.parse(r.pushedAt)) / DAY) / 60 + (r.description ? 2 : 0);
    const rest = repos
      .filter((r) => !r.isFork && !r.isArchived && !excluded.has(lc(r.fullName)) && !out.includes(r))
      .sort((a, b) => score(b) - score(a));
    out.push(...rest);
  }
  return out.slice(0, config.projects.limit);
}

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
