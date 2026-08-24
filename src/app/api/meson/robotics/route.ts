import { NextRequest, NextResponse } from "next/server";
import { getMesonEntry } from "@/ai/meson/registry";
import { resolveGeminiKey, mesonErrorResponse, MesonKeyError } from "@/ai/meson/key-resolution";

export const runtime = "nodejs";

interface RoboticsBody {
  mesonId: string;
  prompt: string;
  image: { mimeType: string; base64: string };
}

/**
 * Gemini Robotics-ER models take an image + instruction and return spatial
 * reasoning (points/boxes/trajectories) as text/JSON via generateContent —
 * same request shape as chat, robotics-specific content is in the prompt
 * and the model's structured text response. Verify exact prompt-format
 * conventions against current Gemini Robotics-ER docs before relying on
 * this in production; that surface is newer than this assistant's training
 * data.
 */
export async function POST(req: NextRequest) {
  let body: RoboticsBody;
  try {
    body = await req.json();
  } catch {
    return mesonErrorResponse(new MesonKeyError(400, "invalid JSON body"));
  }

  const entry = getMesonEntry(body.mesonId);
  if (!entry) return mesonErrorResponse(new MesonKeyError(404, `ไม่รู้จัก mesonId "${body.mesonId}"`));
  if (entry.category !== "robotics") {
    return mesonErrorResponse(new MesonKeyError(400, `${entry.mesonName} ไม่ใช่โมเดล robotics`));
  }
  if (!body.prompt?.trim() || !body.image?.base64) {
    return mesonErrorResponse(new MesonKeyError(400, "ต้องมี prompt และ image"));
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
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: body.image.mimeType, data: body.image.base64 } }, { text: body.prompt }],
        },
      ],
    }),
  }).catch(() => null);

  if (!upstream) return mesonErrorResponse(new MesonKeyError(502, "เชื่อมต่อ Gemini ไม่สำเร็จ"));
  if (!upstream.ok) {
    const t = await upstream.text().catch(() => "");
    return mesonErrorResponse(new MesonKeyError(upstream.status, t || "Gemini ตอบกลับผิดพลาด"));
  }

  const data = await upstream.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";

  return NextResponse.json({ mesonId: entry.mesonId, result: text });
}
