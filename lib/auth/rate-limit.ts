export type RateLimitStatus = {
  limited: boolean;
  retryAfterMs: number;
};

export type RateLimiter = {
  check(key: string): RateLimitStatus;
  recordFailure(key: string): void;
  reset(key?: string): void;
};

type RateLimiterOptions = {
  limit: number;
  windowMs: number;
  now?: () => number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

/**
 * Fixed-window in-memory limiter. It only guards a single Next.js process and
 * is intentionally not persisted; Nginx adds a second layer on /admin/login.
 */
export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: RateLimiterOptions): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    check(key) {
      const time = now();
      const bucket = buckets.get(key);

      if (!bucket) {
        return { limited: false, retryAfterMs: 0 };
      }

      if (time >= bucket.resetAt) {
        buckets.delete(key);
        return { limited: false, retryAfterMs: 0 };
      }

      return {
        limited: bucket.count >= limit,
        retryAfterMs: bucket.resetAt - time,
      };
    },

    recordFailure(key) {
      const time = now();
      const bucket = buckets.get(key);

      if (!bucket || time >= bucket.resetAt) {
        buckets.set(key, { count: 1, resetAt: time + windowMs });
        return;
      }

      bucket.count += 1;
    },

    reset(key) {
      if (key === undefined) {
        buckets.clear();
        return;
      }

      buckets.delete(key);
    },
  };
}

export const LOGIN_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

export const loginIpLimiter = createRateLimiter({
  limit: 5,
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
});

export const loginEmailLimiter = createRateLimiter({
  limit: 10,
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
});
