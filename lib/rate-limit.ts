// In-memory fixed-window rate limiter.
// WARNING: Do NOT import from middleware.ts — Edge Runtime has no setInterval or Map persistence.
// Use only inside Server Action files (Node.js runtime).

const cache = new Map<string, { tries: number; expiresAt: number }>();

// Prune expired entries every 5 minutes to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of cache) {
    if (val.expiresAt < now) cache.delete(key);
  }
}, 5 * 60 * 1000);

export function checkRateLimit(
  key: string,
  opts: { maxTries: number; windowMs: number }
): boolean {
  const now = Date.now();
  const entry = cache.get(key);

  if (!entry || entry.expiresAt < now) {
    cache.set(key, { tries: 1, expiresAt: now + opts.windowMs });
    return true;
  }

  if (entry.tries >= opts.maxTries) return false;
  entry.tries++;
  return true;
}

// Exported for testing only — do NOT use in production code.
export function _resetCache() {
  cache.clear();
}
