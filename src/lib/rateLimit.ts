/** Oddiy in-memory rate-limit (single instance uchun; multi-instance da Redis kerak) */
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetMs: windowMs };
  }
  if (cur.count >= limit) {
    return { ok: false, remaining: 0, resetMs: cur.resetAt - now };
  }
  cur.count += 1;
  return { ok: true, remaining: limit - cur.count, resetMs: cur.resetAt - now };
}

// Vaqti-vaqti bilan eski bucket'larni tozalash (xotira o'smasligi uchun)
if (typeof setInterval !== "undefined") {
  const t = setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k);
    }
  }, 60_000);
  // Next.js HMR / testlarda jarayonni ushlab qolmaslik uchun
  (t as unknown as { unref?: () => void }).unref?.();
}
