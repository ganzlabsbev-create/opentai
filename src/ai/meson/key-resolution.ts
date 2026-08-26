import { NextRequest, NextResponse } from "next/server";
import type { MesonProviderId } from "@/ai/meson/types";
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
 * compatibility with the existing client. Mistral is shared-key only for
 * now (see resolveProviderKey) — there's no Settings UI slot for a
 * per-provider Meson BYOK key yet; add one here (and in the client) if
 * that's needed later.
 */
const PROVIDER_ENV: Record<MesonProviderId, { byokHeader: string | null; sharedEnvVar: string }> = {
  gemini: { byokHeader: "x-gemini-key", sharedEnvVar: "GEMINI_API_KEY_SHARED" },
  mistral: { byokHeader: null, sharedEnvVar: "MISTRAL_API_KEY" },
};

const PROVIDER_LABEL_TH: Record<MesonProviderId, string> = {
  gemini: "Gemini",
  mistral: "Mistral",
};

/**
 * Resolves which API key to use for a Meson entry backed by `providerId`:
 *   - If the client sent its own key via that provider's BYOK header, use
 *     it — never rate limited by us, that's the user's own quota.
 *   - Otherwise fall back to the shared server-side key (the provider's env
 *     var) and enforce the combined 20/day/IP limit shared across all
 *     Meson providers/categories.
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

  const ip = getClientIp(req.headers);
  const quota = await checkAndConsumeSharedKeyQuota(ip);
  if (!quota.allowed) {
    throw new MesonKeyError(
      429,
      `โควตาฟรีของ key กลางหมดแล้ว (จำกัด ${quota.limit} ครั้ง/วัน รวมทุกโมเดล/ทุกผู้ให้บริการ) ใส่ API key ของตัวเองในตั้งค่าเพื่อใช้ต่อได้ไม่จำกัด`
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
