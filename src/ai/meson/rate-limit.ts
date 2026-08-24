import { kv } from "./kv-client";

/**
 * Rate limit for the shared/central Gemini key only. BYOK requests (user's
 * own key) are never limited here — this exists purely to stop the free
 * shared key from being drained.
 *
 * Limit: 20 requests / rolling 24h / IP, counted across ALL Meson
 * categories combined (chat + image + tts + embed + live + video + robotics
 * all share the same counter) — not 20 per model.
 */
const DAILY_LIMIT = 20;
const WINDOW_SECONDS = 24 * 60 * 60;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
}

function keyFor(ip: string): string {
  return `meson:sharedkey:ratelimit:${ip}`;
}

/**
 * Atomically increments the counter for this IP and checks it against the
 * limit. Uses KV INCR + EXPIRE (set only on first increment) so the window
 * is a rolling 24h from first use, not a fixed calendar day.
 */
export async function checkAndConsumeSharedKeyQuota(ip: string): Promise<RateLimitResult> {
  const key = keyFor(ip);

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
    return { allowed: false, remaining: 0, limit: DAILY_LIMIT };
  }

  const remaining = Math.max(0, DAILY_LIMIT - count);
  return { allowed: count <= DAILY_LIMIT, remaining, limit: DAILY_LIMIT };
}

export function getClientIp(headers: Headers): string {
  // Vercel sets x-forwarded-for; take the first (client) address.
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return (fwd.split(",")[0] ?? fwd).trim();
  return headers.get("x-real-ip") ?? "unknown";
}
