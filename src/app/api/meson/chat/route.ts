import { NextRequest } from "next/server";
import { getMesonEntry } from "@/ai/meson/registry";
import { resolveGeminiKey, mesonErrorResponse, MesonKeyError } from "@/ai/meson/key-resolution";

export const runtime = "nodejs";

interface ChatBody {
  mesonId: string;
  messages: { role: "user" | "assistant"; content: string }[];
  context?: string;
}

/**
 * Proxies to Gemini streamGenerateContent and re-streams the SSE body
 * straight through to the client. Only "chat" and "pro" category Meson
 * entries are accepted here — image/tts/embedding/etc. have their own
 * routes because Gemini's request/response shape differs per modality.
 */
export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return mesonErrorResponse(new MesonKeyError(400, "invalid JSON body"));
  }

  const entry = getMesonEntry(body.mesonId);
  if (!entry) return mesonErrorResponse(new MesonKeyError(404, `ไม่รู้จัก mesonId "${body.mesonId}"`));
  if (entry.category !== "chat" && entry.category !== "pro") {
    return mesonErrorResponse(new MesonKeyError(400, `${entry.mesonName} ไม่ใช่โมเดลแชท ใช้ route นี้ไม่ได้`));
  }

  let resolved;
  try {
    resolved = await resolveGeminiKey(req);
  } catch (err) {
    return mesonErrorResponse(err);
  }

  const contents = (body.messages ?? [])
    .filter((m) => m.content?.trim().length > 0)
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

  const requestBody: Record<string, unknown> = { contents };
  if (body.context?.trim()) {
    requestBody.systemInstruction = {
      parts: [{ text: `ใช้บริบทต่อไปนี้ประกอบการตอบเมื่อเกี่ยวข้อง:\n\n${body.context}` }],
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    entry.providerModelId
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(resolved.apiKey)}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal: req.signal,
    });
  } catch (err) {
    return mesonErrorResponse(new MesonKeyError(502, "เชื่อมต่อ Gemini ไม่สำเร็จ"));
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return mesonErrorResponse(new MesonKeyError(upstream.status, text || "Gemini ตอบกลับผิดพลาด"));
  }

  // Pass the upstream SSE stream straight through — client-side parsing is
  // identical to the existing direct-BYOK path (same alt=sse shape).
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Meson-Id": entry.mesonId,
      "X-Meson-Used-Shared-Key": String(resolved.usingSharedKey),
    },
  });
}
