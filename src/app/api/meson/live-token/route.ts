import { NextRequest, NextResponse } from "next/server";
import { getMesonEntry } from "@/ai/meson/registry";
import { resolveGeminiKey, mesonErrorResponse, MesonKeyError } from "@/ai/meson/key-resolution";

export const runtime = "nodejs";

interface LiveTokenBody {
  mesonId: string;
}

/**
 * Issues a short-lived Gemini Live API ephemeral token scoped to one model.
 * The browser then opens the WebSocket directly to Google using this token
 * — our real GEMINI_API_KEY_SHARED / the user's BYOK key never reaches the
 * client, and audio never transits our Vercel functions (per the agreed
 * design). The token itself is single-purpose and expires quickly, so even
 * if it leaked it's low-value.
 *
 * NOTE: the Live API's ephemeral-token endpoint (v1alpha `authTokens`) is a
 * preview surface that postdates this assistant's training data — the
 * field names below (expireTime/newSessionExpireTime/liveConnectConstraints)
 * are the documented shape as of Google's last known Live API docs, but
 * MUST be verified against current docs before shipping, since preview
 * APIs like this change without notice.
 */
export async function POST(req: NextRequest) {
  let body: LiveTokenBody;
  try {
    body = await req.json();
  } catch {
    return mesonErrorResponse(new MesonKeyError(400, "invalid JSON body"));
  }

  const entry = getMesonEntry(body.mesonId);
  if (!entry) return mesonErrorResponse(new MesonKeyError(404, `ไม่รู้จัก mesonId "${body.mesonId}"`));
  if (entry.category !== "live") {
    return mesonErrorResponse(new MesonKeyError(400, `${entry.mesonName} ไม่ใช่โมเดล live voice`));
  }

  let resolved;
  try {
    resolved = await resolveGeminiKey(req);
  } catch (err) {
    return mesonErrorResponse(err);
  }

  const now = Date.now();
  const url = `https://generativelanguage.googleapis.com/v1alpha/authTokens?key=${encodeURIComponent(resolved.apiKey)}`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Token is valid for 5 minutes to start a session, and the session
      // itself may run for up to 30 minutes once connected.
      expireTime: new Date(now + 5 * 60 * 1000).toISOString(),
      newSessionExpireTime: new Date(now + 5 * 60 * 1000).toISOString(),
      uses: 1,
      liveConnectConstraints: {
        model: `models/${entry.providerModelId}`,
      },
    }),
  }).catch(() => null);

  if (!upstream) return mesonErrorResponse(new MesonKeyError(502, "เชื่อมต่อ Gemini ไม่สำเร็จ"));
  if (!upstream.ok) {
    const t = await upstream.text().catch(() => "");
    return mesonErrorResponse(new MesonKeyError(upstream.status, t || "ออก token ไม่สำเร็จ"));
  }

  const data = (await upstream.json()) as { name?: string };
  return NextResponse.json({
    mesonId: entry.mesonId,
    model: entry.providerModelId,
    token: data.name, // the ephemeral token string the browser uses as the WS auth key
  });
}
