import { NextRequest, NextResponse } from "next/server";
import type { MesonProviderId } from "@/ai/meson/types";
import { auth } from "@/auth";
import { checkAndConsumeSharedKeyQuota, getClientIp } from "./rate-limit";

export interface ResolvedKey {
  apiKey: string;
  usingSharedKey: boolean;
}

export class MesonKeyError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * BYOK header + shared-key env var per provider this Meson route can reach.
 * `gemini` keeps its original header name (`x-gemini-key`) for backward
 * compatibility with the existing client. Mistral and Pollinations are
 * shared-key only for now (see resolveProviderKey) — there's no Settings UI
 * slot for a per-provider Meson BYOK key yet; add one here (and in the
 * client) if that's needed later.
 */
const PROVIDER_ENV: Record<MesonProviderId, { byokHeader: string | null; sharedEnvVar: string }> = {
  gemini: { byokHeader: "x-gemini-key", sharedEnvVar: "GEMINI_API_KEY_SHARED" },
  mistral: { byokHeader: null, sharedEnvVar: "MISTRAL_API_KEY" },
  pollinations: { byokHeader: null, sharedEnvVar: "POLLINATIONS_API_KEY" },
};

const PROVIDER_LABEL_TH: Record<MesonProviderId, string> = {
  gemini: "Gemini",
  mistral: "Mistral",
  pollinations: "Pollinations",
};

/**
 * Two quota tiers for the shared-key rate limiter (see rate-limit.ts):
 *   - anonymous (no GitHub session) → scoped by IP → 15/day
 *   - signed in with GitHub          → scoped by GitHub user id → 25/day
 * The two scopes are always separate counters — signing in never touches
 * (or resets) the IP counter for that same visitor, and vice versa.
 */
const IP_DAILY_LIMIT = 15;
const GITHUB_DAILY_LIMIT = 25;

/** Picks the rate-limit scope key + limit for this request based on GitHub Login session state (see src/auth.ts). Never merges the two scopes. */
async function resolveQuotaScope(req: NextRequest): Promise<{ scopeKey: string; limit: number; loggedIn: boolean }> {
  const session = await auth();
  const githubId = session?.user?.githubId;
  if (githubId) {
    return { scopeKey: `gh:${githubId}`, limit: GITHUB_DAILY_LIMIT, loggedIn: true };
  }
  const ip = getClientIp(req.headers);
  return { scopeKey: `ip:${ip}`, limit: IP_DAILY_LIMIT, loggedIn: false };
}

/**
 * Resolves which API key to use for a Meson entry backed by `providerId`:
 *   - If the client sent its own key via that provider's BYOK header, use
 *     it — never rate limited by us, that's the user's own quota.
 *   - Otherwise fall back to the shared server-side key (the provider's env
 *     var) and enforce the 2-tier quota above (15/day anonymous by IP,
 *     25/day signed-in-with-GitHub by GitHub user id) shared across all
 *     Meson providers/categories within that scope.
 * Throws MesonKeyError (with an HTTP status) if neither is usable — the
 * caller is expected to turn that into an error response, never a crash.
 */
export async function resolveProviderKey(req: NextRequest, providerId: MesonProviderId): Promise<ResolvedKey> {
  const config = PROVIDER_ENV[providerId];

  if (config.byokHeader) {
    const byokKey = req.headers.get(config.byokHeader);
    if (byokKey && byokKey.trim().length > 0) {
      return { apiKey: byokKey.trim(), usingSharedKey: false };
    }
  }

  const sharedKey = process.env[config.sharedEnvVar];
  if (!sharedKey) {
    throw new MesonKeyError(
      503,
      `ยังไม่ได้ตั้งค่า key กลางบน Vercel (${config.sharedEnvVar}) สำหรับ ${PROVIDER_LABEL_TH[providerId]} และคำขอนี้ไม่ได้แนบ key ของผู้ใช้เอง`
    );
  }

  const { scopeKey, limit, loggedIn } = await resolveQuotaScope(req);
  const quota = await checkAndConsumeSharedKeyQuota(scopeKey, limit);
  if (!quota.allowed) {
    const hint = loggedIn
      ? "ใส่ API key ของตัวเองในตั้งค่าเพื่อใช้ต่อได้ไม่จำกัด"
      : `เข้าสู่ระบบด้วย GitHub เพื่อเพิ่มโควตาเป็น ${GITHUB_DAILY_LIMIT} ครั้ง/วัน หรือใส่ API key ของตัวเองในตั้งค่าเพื่อใช้ต่อได้ไม่จำกัด`;
    throw new MesonKeyError(
      429,
      `โควตาฟรีของ key กลางหมดแล้ว (จำกัด ${quota.limit} ครั้ง/วัน รวมทุกโมเดล/ทุกผู้ให้บริการ) ${hint}`
    );
  }

  return { apiKey: sharedKey, usingSharedKey: true };
}

/** Back-compat alias — existing routes (image/tts/embed/video/robotics/live-token) are Gemini-only and call this directly. */
export async function resolveGeminiKey(req: NextRequest): Promise<ResolvedKey> {
  return resolveProviderKey(req, "gemini");
}

export function mesonErrorResponse(err: unknown): NextResponse {
  if (err instanceof MesonKeyError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[meson] unhandled error:", err);
  return NextResponse.json({ error: "เกิดข้อผิดพลาดที่ server" }, { status: 500 });
}
