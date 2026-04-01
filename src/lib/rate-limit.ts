/**
 * In-memory sliding-window rate limiter for Edge runtime.
 *
 * Limitations:
 * - State is per-isolate (resets on cold starts / new deployments).
 * - Does not share state across Vercel Edge regions.
 *
 * For production at scale, replace with a persistent rate-limiting store.
 * This implementation is sufficient for moderate traffic because:
 *  1. Middleware already blocks unauthenticated users before they reach here.
 *  2. The window is short (60s) so cold-start resets have minimal impact.
 *  3. A TTL-based cleanup prevents unbounded memory growth.
 */

type RateLimitEntry = { count: number; resetTime: number };

const rateLimitMap = new Map<string, RateLimitEntry>();

const WINDOW_MS = 60_000; // 1-minute sliding window
const MAX_REQUESTS = 15; // max 15 AI requests per minute per key
const CLEANUP_THRESHOLD = 5000; // trigger cleanup when map exceeds this size

function cleanup(now: number) {
  for (const [key, val] of rateLimitMap) {
    if (now > val.resetTime) rateLimitMap.delete(key);
  }
}

/**
 * Rate-limit by a composite key (typically `userId:ip`).
 * Using userId prevents IP-spoofing bypasses.
 */
export function rateLimit(key: string): { allowed: boolean; remaining: number } {
  const now = Date.now();

  if (rateLimitMap.size > CLEANUP_THRESHOLD) cleanup(now);

  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }

  if (entry.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS - entry.count };
}

export function getRateLimitHeaders(remaining: number): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(MAX_REQUESTS),
    'X-RateLimit-Remaining': String(Math.max(0, remaining)),
  };
}
