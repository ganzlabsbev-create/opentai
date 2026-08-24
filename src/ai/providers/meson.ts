import { AppError } from "@/types/errors";
import type { AIProvider, GenerateParams } from "@/ai/providers/types";
import { MESON_REGISTRY } from "@/ai/meson/registry.config";

/**
 * This provider only covers Meson categories that this chat UI actually
 * streams text for today (1.x chat, 2.x pro). The other categories
 * (image/tts/live/video/embedding/robotics) have working backend routes
 * under /api/meson/* already, but no chat-UI surface yet — wiring those in
 * is a separate front-end feature per category, not part of this provider.
 */
const CHAT_MODELS = MESON_REGISTRY.filter((e) => e.category === "chat" || e.category === "pro").map((e) => ({
  id: e.mesonId,
  name: e.mesonName,
  capability: e.blurb,
  context: "-",
}));

interface ChunkShape {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  error?: { code: number; message: string };
}

async function* parseSse(response: Response, signal?: AbortSignal): AsyncGenerator<ChunkShape> {
  if (!response.body) return;
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          yield JSON.parse(payload) as ChunkShape;
        } catch {
          // ignore partial keep-alive lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const MesonProvider: AIProvider = {
  id: "meson",
  name: "Meson",
  desc: "โมเดลกลางของแอป — ใช้ฟรีผ่าน key กลาง (จำกัด 20 ครั้ง/วัน) หรือใส่ Gemini API key ของตัวเองใน Settings เพื่อไม่จำกัด",
  // Marked true so `localOnly` mode correctly excludes it (it does leave the
  // browser, to our own /api/meson/chat route) even though no user-supplied
  // key is strictly required — see isConfigured below.
  requiresApiKey: true,
  models: CHAT_MODELS,
  // Always "configured": works with no key at all (shared key + rate limit)
  // or with the user's own Gemini key (sent as a header, never touches
  // Vercel-side storage or logs beyond the single proxied request).
  isConfigured: () => true,

  async *generateStream({ messages, context, modelId, signal }: GenerateParams, apiKey?: string) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey && apiKey.trim()) headers["x-gemini-key"] = apiKey.trim();

    let response: Response;
    try {
      response = await fetch("/api/meson/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ mesonId: modelId, messages, context }),
        signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      throw new AppError("OFFLINE", undefined, err);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      if (response.status === 429) throw new AppError("RATE_LIMITED", undefined, text);
      if (response.status === 404) throw new AppError("MODEL_UNAVAILABLE", undefined, text);
      throw new AppError("PROVIDER_UNAVAILABLE", undefined, text);
    }

    let sawAnyText = false;
    for await (const chunk of parseSse(response, signal)) {
      if (chunk.error) throw new AppError("PROVIDER_UNAVAILABLE", chunk.error.message);
      const text = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text) {
        sawAnyText = true;
        yield text;
      }
    }

    if (!sawAnyText) {
      throw new AppError("PROVIDER_UNAVAILABLE", "Meson ไม่ส่งคำตอบกลับมา ลองใหม่อีกครั้ง");
    }
  },
};
