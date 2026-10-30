export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export interface RateLimiterOptions {
  /** Requests allowed per key in each window. */
  limit: number;
  windowMs: number;
  now?: () => number;
}

/** The most keys tracked at once. Beyond this, the oldest key is forgotten first. */
const MAX_TRACKED_KEYS = 10_000;

/**
 * A fixed-window rate limiter kept in memory. It protects the submission endpoint from
 * floods. It is per process, which is enough for a single-server demo.
 */
export function createRateLimiter({ limit, windowMs, now = Date.now }: RateLimiterOptions) {
  const windows = new Map<string, { count: number; resetAt: number }>();

  return {
    check(key: string): RateLimitResult {
      const time = now();
      const window = windows.get(key);

      if (!window) {
        // Map keeps insertion order, so the first key is the oldest. Evicting it is constant
        // time, which keeps a flood of new keys from making each request slower.
        if (windows.size >= MAX_TRACKED_KEYS) {
          const oldest = windows.keys().next().value;
          if (oldest !== undefined) windows.delete(oldest);
        }
        windows.set(key, { count: 1, resetAt: time + windowMs });
        return { allowed: true };
      }

      if (window.resetAt <= time) {
        windows.set(key, { count: 1, resetAt: time + windowMs });
        return { allowed: true };
      }

      if (window.count < limit) {
        window.count += 1;
        return { allowed: true };
      }

      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - time) / 1000)),
      };
    },
  };
}
