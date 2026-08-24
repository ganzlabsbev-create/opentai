import { NextRequest, NextResponse } from "next/server";
import { checkAndConsumeSharedKeyQuota, getClientIp } from "./rate-limit";

const BYOK_HEADER = "x-gemini-key";

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
 * Resolves which Gemini key to use for this request:
 *   - If the client sent its own key (BYOK header), use it — never rate
 *     limited by us, that's the user's own quota with Google.
 *   - Otherwise fall back to the shared server-side key (GEMINI_API_KEY_SHARED
 *     env var on Vercel) and enforce the 20/day/IP combined limit.
 * Throws MesonKeyError (with an HTTP status) if neither is usable.
 */
export async function resolveGeminiKey(req: NextRequest): Promise<ResolvedKey> {
  const byokKey = req.headers.get(BYOK_HEADER);
  if (byokKey && byokKey.trim().length > 0) {
    return { apiKey: byokKey.trim(), usingSharedKey: false };
  }

  const sharedKey = process.env.GEMINI_API_KEY_SHARED;
  if (!sharedKey) {
    throw new MesonKeyError(
      503,
      "ยังไม่ได้ตั้งค่า key กลางบน Vercel (GEMINI_API_KEY_SHARED) และคำขอนี้ไม่ได้แนบ key ของผู้ใช้เอง"
    );
  }

  const ip = getClientIp(req.headers);
  const quota = await checkAndConsumeSharedKeyQuota(ip);
  if (!quota.allowed) {
    throw new MesonKeyError(
      429,
      `โควตาฟรีของ key กลางหมดแล้ว (จำกัด ${quota.limit} ครั้ง/วัน รวมทุกโมเดล) ใส่ Gemini API key ของตัวเองในตั้งค่าเพื่อใช้ต่อได้ไม่จำกัด`
    );
  }

  return { apiKey: sharedKey, usingSharedKey: true };
}

export function mesonErrorResponse(err: unknown): NextResponse {
  if (err instanceof MesonKeyError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[meson] unhandled error:", err);
  return NextResponse.json({ error: "เกิดข้อผิดพลาดที่ server" }, { status: 500 });
}
