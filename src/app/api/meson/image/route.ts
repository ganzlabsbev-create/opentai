import { NextRequest, NextResponse } from "next/server";
import { getMesonEntry } from "@/ai/meson/registry";
import { resolveGeminiKey, mesonErrorResponse, MesonKeyError } from "@/ai/meson/key-resolution";

export const runtime = "nodejs";

interface ImageBody {
  mesonId: string;
  prompt: string;
  /** Optional base64 input image(s) for editing, data URLs stripped to raw base64 by the client. */
  inputImages?: { mimeType: string; base64: string }[];
}

/**
 * Gemini image-capable models return images via generateContent with
 * responseModalities including "IMAGE" — same endpoint shape as chat, just
 * a different response part type (inlineData instead of text).
 * NOTE: exact request shape for these specific 3.x preview/GA image models
 * should be verified against Google's current docs before shipping —
 * flagging here since these model ids postdate this assistant's training
 * data and the finer request details couldn't be independently confirmed.
 */
export async function POST(req: NextRequest) {
  let body: ImageBody;
  try {
    body = await req.json();
  } catch {
    return mesonErrorResponse(new MesonKeyError(400, "invalid JSON body"));
  }

  const entry = getMesonEntry(body.mesonId);
  if (!entry) return mesonErrorResponse(new MesonKeyError(404, `ไม่รู้จัก mesonId "${body.mesonId}"`));
  if (entry.category !== "image") {
    return mesonErrorResponse(new MesonKeyError(400, `${entry.mesonName} ไม่ใช่โมเดลรูปภาพ`));
  }
  if (!body.prompt?.trim()) {
    return mesonErrorResponse(new MesonKeyError(400, "ต้องมี prompt"));
  }

  let resolved;
  try {
    resolved = await resolveGeminiKey(req);
  } catch (err) {
    return mesonErrorResponse(err);
  }

  const parts: Record<string, unknown>[] = [{ text: body.prompt }];
  for (const img of body.inputImages ?? []) {
    parts.push({ inlineData: { mimeType: img.mimeType, data: img.base64 } });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    entry.providerModelId
  )}:generateContent?key=${encodeURIComponent(resolved.apiKey)}`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  }).catch(() => null);

  if (!upstream) return mesonErrorResponse(new MesonKeyError(502, "เชื่อมต่อ Gemini ไม่สำเร็จ"));
  if (!upstream.ok) {
    const t = await upstream.text().catch(() => "");
    return mesonErrorResponse(new MesonKeyError(upstream.status, t || "Gemini ตอบกลับผิดพลาด"));
  }

  const data = await upstream.json();
  const imageParts =
    data?.candidates?.[0]?.content?.parts?.filter((p: any) => p.inlineData) ?? [];

  return NextResponse.json({
    mesonId: entry.mesonId,
    images: imageParts.map((p: any) => ({ mimeType: p.inlineData.mimeType, base64: p.inlineData.data })),
  });
}
