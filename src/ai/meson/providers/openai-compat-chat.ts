import { MesonKeyError } from "@/ai/meson/key-resolution";
import type { ChatProxy, ProxyChatParams } from "./types";

/** How long we'll wait for the upstream response to start (headers) before giving up. Once headers arrive this no longer applies — a long streaming reply is never cut short by it. */
const CONNECT_TIMEOUT_MS = 30_000;

interface OpenAIStreamChunk {
  choices?: { delta?: { content?: string }; finish_reason?: string | null }[];
  error?: { message?: string; type?: string; code?: string };
}

function mapHttpError(status: number, body: string): MesonKeyError {
  if (status === 401 || status === 403) return new MesonKeyError(status, "API key ไม่ถูกต้องหรือไม่มีสิทธิ์เรียกโมเดลนี้");
  if (status === 429) return new MesonKeyError(429, "โควตา/rate limit ของผู้ให้บริการเต็ม ลองใหม่อีกครั้งภายหลัง");
  if (status === 404) return new MesonKeyError(404, "ไม่พบโมเดลนี้ที่ผู้ให้บริการ (อาจถูกเลิกใช้งานแล้ว)");
  if (status >= 500) return new MesonKeyError(502, "ผู้ให้บริการต้นทางขัดข้อง");
  return new MesonKeyError(status, body || `ผู้ให้บริการตอบกลับผิดพลาด (${status})`);
}

/** fetch() with a connect-timeout that stops applying once the response headers arrive, so a long SSE reply is never cut short — only a stuck/slow connection is. */
async function fetchWithConnectTimeout(url: string, init: RequestInit, externalSignal?: AbortSignal): Promise<Response> {
  const controller = new AbortController();
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    externalSignal.addEventListener("abort", onExternalAbort);
  }
  const timeoutId = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);

  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    if (externalSignal?.aborted) {
      // Genuine client-initiated abort — let it propagate as-is.
      throw err;
    }
    throw new MesonKeyError(504, "เชื่อมต่อผู้ให้บริการไม่สำเร็จภายในเวลาที่กำหนด");
  } finally {
    if (externalSignal) externalSignal.removeEventListener("abort", onExternalAbort);
  }
}

/** Translates an OpenAI-compatible `data: {...}` SSE body into the Gemini-shaped SSE the client already parses (`candidates[0].content.parts[].text`). */
function toGeminiShapedStream(upstream: Response): ReadableStream<Uint8Array> {
  const body = upstream.body;
  if (!body) {
    return new ReadableStream({
      start(controller) {
        controller.close();
      },
    });
  }

  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();
  let buffer = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let parsed: OpenAIStreamChunk;
        try {
          parsed = JSON.parse(payload) as OpenAIStreamChunk;
        } catch {
          continue; // ignore partial/keep-alive lines, same as the Gemini/Meson client parsers do
        }

        if (parsed.error) {
          // Surface as a Gemini-shaped error chunk so the existing client parser's
          // `if (chunk.error) throw ...` path (in ai/providers/meson.ts) fires unchanged.
          const errChunk = { error: { code: 502, message: parsed.error.message ?? "upstream error" } };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errChunk)}\n\n`));
          continue;
        }

        const text = parsed.choices?.[0]?.delta?.content ?? "";
        if (!text) continue;
        const geminiChunk = { candidates: [{ content: { parts: [{ text }] } }] };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(geminiChunk)}\n\n`));
      }
    },
    cancel(reason) {
      reader.cancel(reason).catch(() => {});
    },
  });
}

/**
 * Builds a ChatProxy for any OpenAI-compatible `/chat/completions` endpoint
 * (Mistral is, today). `chatCompletionsUrl` must be the full URL including
 * path, since providers can use different path shapes
 * (e.g. `/v1/chat/completions` vs `/chat/completions`).
 */
export function createOpenAICompatChatProxy(chatCompletionsUrl: string): ChatProxy {
  return async function proxyOpenAICompatChat({ entry, apiKey, messages, context, signal }: ProxyChatParams) {
    const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];
    if (context?.trim()) {
      chatMessages.push({ role: "system", content: `ใช้บริบทต่อไปนี้ประกอบการตอบเมื่อเกี่ยวข้อง:\n\n${context}` });
    }
    for (const m of messages) {
      if (!m.content?.trim()) continue;
      chatMessages.push({ role: m.role, content: m.content });
    }

    const requestBody = {
      model: entry.providerModelId,
      messages: chatMessages,
      stream: true,
    };

    let upstream: Response;
    try {
      upstream = await fetchWithConnectTimeout(
        chatCompletionsUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        },
        signal
      );
    } catch (err) {
      if (err instanceof MesonKeyError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      throw new MesonKeyError(502, `เชื่อมต่อ ${entry.providerId} ไม่สำเร็จ`);
    }

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      throw mapHttpError(upstream.status, text);
    }

    return new Response(toGeminiShapedStream(upstream), {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "X-Meson-Id": entry.mesonId,
      },
    });
  };
}
