/**
 * Thin fetch wrapper for GitHub: timeouts, bounded retries with backoff,
 * and rate-limit awareness. No credentials are ever logged.
 */

export class RateLimitError extends Error {
  readonly resetAt: Date | null;
  constructor(resetAt: Date | null) {
    super(`GitHub rate limit exhausted${resetAt ? ` (resets ${resetAt.toISOString()})` : ''}`);
    this.resetAt = resetAt;
  }
}

const UA = 'profile-engine (+https://github.com/features/actions)';

export function token(): string | undefined {
  return process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined;
}

export interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  accept?: string;
  auth?: boolean;
  retries?: number;
  timeoutMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function request(url: string, o: RequestOptions = {}): Promise<Response> {
  const retries = o.retries ?? 3;
  const headers: Record<string, string> = {
    'User-Agent': UA,
    Accept: o.accept ?? 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  const t = o.auth === false ? undefined : token();
  if (t) headers.Authorization = `Bearer ${t}`;
  if (o.body !== undefined) headers['Content-Type'] = 'application/json';

  let lastError: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        method: o.method ?? 'GET',
        headers,
        body: o.body === undefined ? undefined : JSON.stringify(o.body),
        signal: AbortSignal.timeout(o.timeoutMs ?? 20_000),
      });

      if (res.ok) return res;

      const remaining = res.headers.get('x-ratelimit-remaining');
      const reset = res.headers.get('x-ratelimit-reset');
      const retryAfter = Number(res.headers.get('retry-after') ?? NaN);

      // Primary rate limit: retrying is pointless until the reset time.
      if ((res.status === 403 || res.status === 429) && remaining === '0') {
        throw new RateLimitError(reset ? new Date(Number(reset) * 1000) : null);
      }
      // Secondary rate limit or transient server error: back off and retry.
      if (res.status === 429 || res.status === 403 || res.status >= 500) {
        const wait = Number.isFinite(retryAfter) ? Math.min(retryAfter, 60) * 1000 : 1000 * 2 ** attempt;
        lastError = new Error(`HTTP ${res.status} for ${new URL(url).pathname}`);
        if (attempt < retries) await sleep(wait);
        continue;
      }
      // Other 4xx: not retryable.
      throw new Error(`HTTP ${res.status} for ${new URL(url).pathname}`);
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.startsWith('HTTP 4')) throw err;
      if (attempt < retries) await sleep(1000 * 2 ** attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}
