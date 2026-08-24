import { NextRequest, NextResponse } from "next/server";
import { getMesonEntry } from "@/ai/meson/registry";
import { resolveGeminiKey, mesonErrorResponse, MesonKeyError } from "@/ai/meson/key-resolution";

export const runtime = "nodejs";

interface TtsBody {
  mesonId: string;
  text: string;
  voiceName?: string; // e.g. "Kore" — passed through as-is; validate choices client-side against Google's current voice list.
}

/**
 * NOTE: same caveat as image/route.ts — the exact speechConfig shape for
 * this specific preview TTS model should be double-checked against current
 * Gemini docs; the general generateContent + responseModalities:["AUDIO"]
 * pattern is the well-established part.
 */
export async function POST(req: NextRequest) {
  let body: TtsBody;
  try {
    body = await req.json();
  } catch {
    return mesonErrorResponse(new MesonKeyError(400, "invalid JSON body"));
  }

  const entry = getMesonEntry(body.mesonId);
  if (!entry) return mesonErrorResponse(new MesonKeyError(404, `ไม่รู้จัก mesonId "${body.mesonId}"`));
  if (entry.category !== "tts") {
    return mesonErrorResponse(new MesonKeyError(400, `${entry.mesonName} ไม่ใช่โมเดล TTS`));
  }
  if (!body.text?.trim()) {
    return mesonErrorResponse(new MesonKeyError(400, "ต้องมี text"));
  }

  let resolved;
  try {
    resolved = await resolveGeminiKey(req);
  } catch (err) {
    return mesonErrorResponse(err);
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    entry.providerModelId
  )}:generateContent?key=${encodeURIComponent(resolved.apiKey)}`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: body.text }] }],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: body.voiceName
          ? { voiceConfig: { prebuiltVoiceConfig: { voiceName: body.voiceName } } }
          : undefined,
      },
    }),
  }).catch(() => null);

  if (!upstream) return mesonErrorResponse(new MesonKeyError(502, "เชื่อมต่อ Gemini ไม่สำเร็จ"));
  if (!upstream.ok) {
    const t = await upstream.text().catch(() => "");
    return mesonErrorResponse(new MesonKeyError(upstream.status, t || "Gemini ตอบกลับผิดพลาด"));
  }

  const data = await upstream.json();
  const audioPart = data?.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);

  if (!audioPart) return mesonErrorResponse(new MesonKeyError(502, "Gemini ไม่ส่งเสียงกลับมา"));

  return NextResponse.json({
    mesonId: entry.mesonId,
    mimeType: audioPart.inlineData.mimeType,
    base64: audioPart.inlineData.data,
  });
}
