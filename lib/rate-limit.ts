interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  reset: number;
}

interface RateLimitEntry {
  count: number;
  reset: number;
}

// In-memory store
const store = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.reset) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000).unref?.();

export async function rateLimit({ key, limit, windowMs }: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.reset) {
    entry = { count: 0, reset: now + windowMs };
  }

  entry.count += 1;
  store.set(key, entry);

  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);

  return {
    allowed,
    remaining,
    reset: entry.reset,
  };
}
