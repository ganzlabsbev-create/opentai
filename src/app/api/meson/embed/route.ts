import { NextRequest, NextResponse } from "next/server";
import { getMesonEntry } from "@/ai/meson/registry";
import { resolveGeminiKey, mesonErrorResponse, MesonKeyError } from "@/ai/meson/key-resolution";

export const runtime = "nodejs";

interface EmbedBody {
  mesonId: string;
  text: string;
}

export async function POST(req: NextRequest) {
  let body: EmbedBody;
  try {
    body = await req.json();
  } catch {
    return mesonErrorResponse(new MesonKeyError(400, "invalid JSON body"));
  }

  const entry = getMesonEntry(body.mesonId);
  if (!entry) return mesonErrorResponse(new MesonKeyError(404, `ไม่รู้จัก mesonId "${body.mesonId}"`));
  if (entry.category !== "embedding") {
    return mesonErrorResponse(new MesonKeyError(400, `${entry.mesonName} ไม่ใช่โมเดล embedding`));
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
  )}:embedContent?key=${encodeURIComponent(resolved.apiKey)}`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: { parts: [{ text: body.text }] } }),
  }).catch(() => null);

  if (!upstream) return mesonErrorResponse(new MesonKeyError(502, "เชื่อมต่อ Gemini ไม่สำเร็จ"));
  if (!upstream.ok) {
    const t = await upstream.text().catch(() => "");
    return mesonErrorResponse(new MesonKeyError(upstream.status, t || "Gemini ตอบกลับผิดพลาด"));
  }

  const data = (await upstream.json()) as { embedding?: { values: number[] } };
  return NextResponse.json({ mesonId: entry.mesonId, embedding: data.embedding?.values ?? [] });
}
