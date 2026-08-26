import { describe, expect, it, vi, afterEach } from "vitest";
import { createOpenAICompatChatProxy } from "@/ai/meson/providers/openai-compat-chat";
import type { MesonEntry } from "@/ai/meson/types";
import { MesonKeyError } from "@/ai/meson/key-resolution";

function sseStream(lines: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const line of lines) controller.enqueue(encoder.encode(line));
      controller.close();
    },
  });
}

async function readAllText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let out = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    out += decoder.decode(value, { stream: true });
  }
  return out;
}

const fakeEntry: MesonEntry = {
  mesonId: "meson-1.5",
  mesonName: "Meson 1.5",
  category: "chat",
  providerId: "mistral",
  providerModelId: "mistral-medium-3-5",
  declaredStability: "stable",
  blurb: "test",
};

describe("ai/meson/providers/openai-compat-chat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("translates OpenAI-style delta chunks into the Gemini-shaped SSE the client parser expects", async () => {
    const body = sseStream([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(body, { status: 200 }))
    );

    const proxy = createOpenAICompatChatProxy("https://api.example.com/v1/chat/completions");
    const res = await proxy({ entry: fakeEntry, apiKey: "k", messages: [{ role: "user", content: "hi" }] });
    expect(res.status).toBe(200);
    const text = await readAllText(res.body!);

    expect(text).toContain('"text":"Hello"');
    expect(text).toContain('"text":" world"');
    // Must be shaped like Gemini's candidates[0].content.parts[].text, not OpenAI's choices[].delta.
    expect(text).toContain("candidates");
    expect(text).not.toContain('"choices"');
  });

  it("maps a 401 upstream response to an INVALID_API_KEY-equivalent MesonKeyError instead of crashing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }))
    );
    const proxy = createOpenAICompatChatProxy("https://api.example.com/v1/chat/completions");
    await expect(proxy({ entry: fakeEntry, apiKey: "bad-key", messages: [] })).rejects.toBeInstanceOf(MesonKeyError);
  });

  it("maps a 429 upstream response to a rate-limit MesonKeyError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("too many requests", { status: 429 })));
    const proxy = createOpenAICompatChatProxy("https://api.example.com/v1/chat/completions");
    await expect(proxy({ entry: fakeEntry, apiKey: "k", messages: [] })).rejects.toMatchObject({ status: 429 });
  });

  it("prepends assembled context as a system message", async () => {
    let capturedBody: string | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, init: RequestInit) => {
        capturedBody = init.body as string;
        return Promise.resolve(new Response(sseStream(["data: [DONE]\n\n"]), { status: 200 }));
      })
    );
    const proxy = createOpenAICompatChatProxy("https://api.example.com/v1/chat/completions");
    await proxy({ entry: fakeEntry, apiKey: "k", messages: [{ role: "user", content: "hi" }], context: "some context" });
    const parsed = JSON.parse(capturedBody!);
    expect(parsed.messages[0]).toEqual({ role: "system", content: expect.stringContaining("some context") });
    expect(parsed.stream).toBe(true);
    expect(parsed.model).toBe("mistral-medium-3-5");
  });
});
