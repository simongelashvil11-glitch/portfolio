/*
 * A small in-memory rate limiter: at most `limit` hits per key within
 * `windowMs`. Memory lives per server instance, so on Vercel it slows down
 * hammering from one address rather than enforcing an exact global count —
 * enough to make guessing the admin password or flooding the visit log
 * impractical without adding a store.
 */

const buckets = new Map<string, number[]>();

/** Records a hit for `key`; returns false once the key is over its limit. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);
  recent.push(now);
  buckets.set(key, recent);

  // Keep memory bounded on a long-lived instance.
  if (buckets.size > 5000) {
    for (const [name, times] of buckets) {
      if (times.every((time) => now - time >= windowMs)) buckets.delete(name);
    }
    if (buckets.size > 5000) buckets.clear();
  }

  return recent.length <= limit;
}

/** The caller's address from the proxy headers Vercel sets, or "unknown". */
export function requestIp(headers: Headers): string {
  return (
    headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  ).slice(0, 64);
}
