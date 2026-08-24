import { AppError } from "@/types/errors";
import type { AIProvider, GenerateParams } from "@/ai/providers/types";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Google's model lineup changes over time and this app has no server to
 * proxy a "list models" call through without exposing the user's key
 * cross-origin in a way that complicates BYOK, so the two most common
 * current Gemini chat models are listed here. Users can swap the model id
 * in Settings → advanced if Google renames/retires one of these.
 */
const GEMINI_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", capability: "แชท, โค้ด, รูปภาพ", context: "1M" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", capability: "แชท, โค้ด, รูปภาพ, เหตุผลเชิงลึก", context: "1M" },
];

interface GeminiStreamChunk {
  candidates?: {
    content?: { parts?: { text?: string }[] };
    finishReason?: string;
  }[];
  error?: { code: number; message: string; status?: string };
}

function mapHttpError(status: number, body: string): AppError {
  if (status === 400 || status === 401 || status === 403) {
    return new AppError("INVALID_API_KEY", undefined, body);
  }
  if (status === 429) {
    return new AppError("RATE_LIMITED", undefined, body);
  }
  if (status === 404) {
    return new AppError("MODEL_UNAVAILABLE", undefined, body);
  }
  if (status >= 500) {
    return new AppError("PROVIDER_UNAVAILABLE", undefined, body);
  }
  return new AppError("UNKNOWN", `Gemini API error (${status})`, body);
}

/** Parses a text/event-stream body of `data: {...}` lines into decoded JSON chunks. */
async function* parseSse(response: Response, signal?: AbortSignal): AsyncGenerator<GeminiStreamChunk> {
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
          yield JSON.parse(payload) as GeminiStreamChunk;
        } catch {
          // Ignore partial/non-JSON keep-alive lines.
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const GeminiProvider: AIProvider = {
  id: "gemini",
  name: "Gemini",
  desc: "BYOK — ใส่ API key ของ Google AI Studio เอง เก็บไว้ในเครื่องเท่านั้น",
  requiresApiKey: true,
  models: GEMINI_MODELS,
  isConfigured: (apiKey) => !!apiKey && apiKey.trim().length > 0,

  async *generateStream({ messages, context, modelId, signal }: GenerateParams, apiKey?: string) {
    if (!apiKey) throw new AppError("INVALID_API_KEY", "ยังไม่ได้ตั้งค่า API key สำหรับ Gemini");

    const contents = messages
      .filter((m) => m.content.trim().length > 0)
      .map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));

    const body: Record<string, unknown> = { contents };
    if (context && context.trim().length > 0) {
      body.systemInstruction = { parts: [{ text: `ใช้บริบทต่อไปนี้ประกอบการตอบเมื่อเกี่ยวข้อง:\n\n${context}` }] };
    }

    const url = `${BASE_URL}/${encodeURIComponent(modelId)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      throw new AppError("OFFLINE", undefined, err);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw mapHttpError(response.status, text);
    }

    let sawAnyText = false;
    for await (const chunk of parseSse(response, signal)) {
      if (chunk.error) throw mapHttpError(chunk.error.code, chunk.error.message);
      const text = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
      if (text) {
        sawAnyText = true;
        yield text;
      }
    }

    if (!sawAnyText) {
      throw new AppError("PROVIDER_UNAVAILABLE", "Gemini ไม่ส่งคำตอบกลับมา ลองใหม่อีกครั้ง");
    }
  },
};
