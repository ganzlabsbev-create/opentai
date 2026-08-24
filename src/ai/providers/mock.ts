import type { AIProvider, GenerateParams } from "@/ai/providers/types";

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/**
 * Real streaming provider that needs no API key — always available so the
 * app is usable offline/without BYOK. It's not a hardcoded chat reply
 * baked into a component (that was the Phase 1 prototype's `MOCK_REPLY`);
 * it's a first-class `AIProvider` that actually reads the conversation and
 * any assembled context, and streams a response chunk-by-chunk like a real
 * provider would. The UI always labels it "Mock Provider" so nobody
 * mistakes it for a real model.
 */
export const MockProvider: AIProvider = {
  id: "mock",
  name: "Mock Provider",
  desc: "ใช้พัฒนา/ทดสอบโดยไม่ต้องมี API key — ไม่ส่งข้อมูลออกจากเครื่อง",
  requiresApiKey: false,
  models: [
    { id: "mock-v1", name: "ThaiAI Mock v1", capability: "แชท, โค้ด", context: "32K" },
    { id: "mock-vision", name: "ThaiAI Mock Vision", capability: "แชท, รูปภาพ", context: "16K" },
  ],
  isConfigured: () => true,

  async *generateStream({ messages, context, signal }: GenerateParams) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    const parts: string[] = [
      `รับข้อความแล้วครับ: "${lastUser.slice(0, 80)}${lastUser.length > 80 ? "…" : ""}"\n\n`,
      "นี่คือคำตอบจาก **Mock Provider** — จำลองการทำงานของ AI จริงในเครื่องคุณ ไม่ได้ส่งข้อมูลออกไปที่ไหน\n\n",
    ];

    if (context && context.trim().length > 0) {
      parts.push(`อ่านบริบทที่แนบมาแล้ว (~${Math.ceil(context.length / 4)} token โดยประมาณ) และนำมาพิจารณาร่วมด้วย\n\n`);
    }

    parts.push(
      "```ts\nfunction sortThai(list: string[]) {\n  return list.sort((a, b) => a.localeCompare(b, 'th'));\n}\n```\n\n",
      "เมื่อเชื่อมต่อ provider จริง (เช่น Gemini) ในหน้าโมเดล คำตอบจะมาจากโมเดลจริงแทน แต่ตัวเรนเดอร์และ UI ใช้ชุดเดียวกันนี้ทั้งหมด"
    );

    const full = parts.join("");
    const step = Math.max(3, Math.floor(full.length / 40));
    for (let i = 0; i < full.length; i += step) {
      await sleep(28, signal);
      yield full.slice(i, i + step);
    }
  },
};
