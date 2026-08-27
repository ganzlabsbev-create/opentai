import { kv } from "./kv-client";

/**
 * Rate limit for the shared/central provider keys only. BYOK requests
 * (user's own key) are never limited here — this exists purely to stop the
 * free shared keys from being drained.
 *
 * Two quota tiers, each its own counter (never merged — see
 * key-resolution.ts for which scope key is chosen):
 *   - not logged in with GitHub → scoped by IP → 15 req/rolling 24h
 *   - logged in with GitHub     → scoped by GitHub user id → 25 req/rolling 24h
 * Each counter is combined across ALL Meson categories (chat + image + tts +
 * embed + live + video + robotics all share the same counter within a
 * scope) — not N per model, and not per provider either.
 */
const WINDOW_SECONDS = 24 * 60 * 60;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

function keyFor(scopeKey: string): string {
  return `meson:sharedkey:ratelimit:${scopeKey}`;
}

/**
 * Atomically increments the counter for `scopeKey` and checks it against
 * `limit`. Uses KV INCR + EXPIRE (set only on first increment) so the
 * window is a rolling 24h from first use, not a fixed calendar day.
 *
 * `scopeKey` should already carry its scope prefix, e.g. `ip:1.2.3.4` or
 * `gh:12345` — see key-resolution.ts, which is the only caller. The two
 * scopes never share a counter even for the "same" underlying visitor.
 */
export async function checkAndConsumeSharedKeyQuota(scopeKey: string, limit: number): Promise<RateLimitResult> {
  const key = keyFor(scopeKey);

  let count: number;
  try {
    count = await kv.incr(key);
    if (count === 1) {
      await kv.expire(key, WINDOW_SECONDS);
    }
  } catch (err) {
    // If KV itself is down, fail closed for the shared key specifically —
    // better to briefly deny free-tier traffic than let quota be drained
    // unbounded while KV is unreachable.
    console.error("[meson/rate-limit] KV error, denying shared-key request:", err);
    return { allowed: false, remaining: 0, limit };
  }

  const remaining = Math.max(0, limit - count);
  return { allowed: count <= limit, remaining, limit };
}

export interface QuotaPeekResult {
  used: number;
  limit: number;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Read-only peek at the shared-key quota counter for `scopeKey` — uses
 * KV GET + TTL, never INCR, so calling this does not consume any quota.
 * Used by the /quota page so users can check their usage without it
 * counting against them.
 *
 * If the counter has never been incremented today (key doesn't exist yet),
 * returns used=0 and resetInSeconds=0 — there's nothing to count down from
 * until the first shared-key request of the window.
 */
export async function peekSharedKeyQuota(scopeKey: string, limit: number): Promise<QuotaPeekResult> {
  const key = keyFor(scopeKey);

  try {
    const [count, ttl] = await Promise.all([kv.get<number>(key), kv.ttl(key)]);
    const used = typeof count === "number" && count > 0 ? count : 0;
    const resetInSeconds = used > 0 && typeof ttl === "number" && ttl > 0 ? ttl : 0;
    return { used, limit, remaining: Math.max(0, limit - used), resetInSeconds };
  } catch (err) {
    console.error("[meson/rate-limit] KV error while peeking shared-key quota:", err);
    return { used: 0, limit, remaining: limit, resetInSeconds: 0 };
  }
}

export function getClientIp(headers: Headers): string {
  // Vercel sets x-forwarded-for; take the first (client) address.
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return (fwd.split(",")[0] ?? fwd).trim();
  return headers.get("x-real-ip") ?? "unknown";
}
