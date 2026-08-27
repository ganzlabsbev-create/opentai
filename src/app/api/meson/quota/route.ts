import { NextRequest, NextResponse } from "next/server";
import { resolveQuotaScope } from "@/ai/meson/key-resolution";
import { peekSharedKeyQuota } from "@/ai/meson/rate-limit";

export const runtime = "nodejs";

/**
 * Read-only status of the caller's shared-key quota (see rate-limit.ts +
 * key-resolution.ts) — used by the /quota page. Reuses resolveQuotaScope
 * (auth() session check + IP/GitHub scope selection) so this always agrees
 * with whatever a real Meson request would be scoped/limited to, then peeks
 * the counter without incrementing it.
 */
export async function GET(req: NextRequest) {
  const { scopeKey, limit, loggedIn } = await resolveQuotaScope(req);
  const quota = await peekSharedKeyQuota(scopeKey, limit);

  return NextResponse.json({
    loggedIn,
    used: quota.used,
    limit: quota.limit,
    remaining: quota.remaining,
    resetInSeconds: quota.resetInSeconds,
  });
}
