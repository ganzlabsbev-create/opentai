import { MesonKeyError } from "@/ai/meson/key-resolution";
import type { ChatProxy } from "./types";

/**
 * Proxies to Gemini streamGenerateContent and returns the upstream SSE body
 * as-is — Gemini's chunk shape (`candidates[0].content.parts[].text`) is
 * already the shape the client parser expects, so no transform is needed
 * here (unlike the OpenAI-compatible proxies).
 */
export const proxyGeminiChat: ChatProxy = async ({ entry, apiKey, messages, context, signal }) => {
  const contents = messages
    .filter((m) => m.content?.trim().length > 0)
    .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

  const requestBody: Record<string, unknown> = { contents };
  if (context?.trim()) {
    requestBody.systemInstruction = {
      parts: [{ text: `ใช้บริบทต่อไปนี้ประกอบการตอบเมื่อเกี่ยวข้อง:\n\n${context}` }],
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    entry.providerModelId
  )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
      signal,
    });
  } catch {
    throw new MesonKeyError(502, "เชื่อมต่อ Gemini ไม่สำเร็จ");
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    throw new MesonKeyError(upstream.status, text || "Gemini ตอบกลับผิดพลาด");
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Meson-Id": entry.mesonId,
    },
  });
};
