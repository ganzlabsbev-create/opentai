import type { MesonEntry } from "./types";

/**
 * Source of truth for Meson ↔ Gemini mapping.
 *
 * RULES (enforced by registry.ts, not just convention):
 *   - 1 Meson entry = 1 (providerId, providerModelId) pair.
 *   - The same providerModelId must never appear twice. registry.ts throws
 *     at load time if it does — this is intentional, do not silence it.
 *   - To change a mapping, edit this file and redeploy. There is no runtime
 *     edit path (see /app/admin/meson — view only, by design).
 *   - declaredStability is a fallback hint only; live availability always
 *     wins (see availability.ts).
 */
export const MESON_REGISTRY: MesonEntry[] = [
  // 1.x — General / Chat / Multimodal / Fast
  { mesonId: "meson-1.0", mesonName: "Meson 1.0", category: "chat", providerId: "gemini", providerModelId: "gemini-3.7-flash", declaredStability: "stable", blurb: "รุ่นแชททั่วไป เร็วและรองรับหลายสื่อ" },
  { mesonId: "meson-1.1", mesonName: "Meson 1.1", category: "chat", providerId: "gemini", providerModelId: "gemini-3.6-flash", declaredStability: "stable", blurb: "แชททั่วไป รุ่นก่อนหน้า" },
  { mesonId: "meson-1.2", mesonName: "Meson 1.2", category: "chat", providerId: "gemini", providerModelId: "gemini-3.5-flash", declaredStability: "stable", blurb: "แชททั่วไป สมดุลความเร็ว/คุณภาพ" },
  { mesonId: "meson-1.3", mesonName: "Meson 1.3", category: "chat", providerId: "gemini", providerModelId: "gemini-3.5-flash-lite", declaredStability: "stable", blurb: "รุ่นเบา ประหยัด เหมาะงานปริมาณมาก" },
  { mesonId: "meson-1.4", mesonName: "Meson 1.4", category: "chat", providerId: "gemini", providerModelId: "gemini-3.1-flash-lite", declaredStability: "stable", blurb: "รุ่นเบาสุด ต้นทุนต่ำสุดในสาย 1.x" },

  // 2.x — Pro / Reasoning / Coding
  { mesonId: "meson-2.0", mesonName: "Meson 2.0", category: "pro", providerId: "gemini", providerModelId: "gemini-3.1-pro-preview", declaredStability: "preview", blurb: "โปร เหตุผลเชิงลึก โค้ดดิ้ง" },
  { mesonId: "meson-2.1", mesonName: "Meson 2.1", category: "pro", providerId: "gemini", providerModelId: "gemini-3-flash-preview", declaredStability: "preview", blurb: "เหตุผลเชิงลึกแบบเร็วกว่า" },

  // 3.x — Image Generation / Editing
  { mesonId: "meson-3.0", mesonName: "Meson 3.0", category: "image", providerId: "gemini", providerModelId: "gemini-3.1-flash-image", declaredStability: "stable", blurb: "สร้าง/แก้ไขรูปภาพ" },
  { mesonId: "meson-3.1", mesonName: "Meson 3.1", category: "image", providerId: "gemini", providerModelId: "gemini-3.1-flash-lite-image", declaredStability: "stable", blurb: "สร้าง/แก้ไขรูปภาพ รุ่นเบา" },
  { mesonId: "meson-3.2", mesonName: "Meson 3.2", category: "image", providerId: "gemini", providerModelId: "gemini-3-pro-image", declaredStability: "stable", blurb: "สร้าง/แก้ไขรูปภาพ คุณภาพสูงสุด" },

  // 4.x — Live / Realtime Voice / Speech Translation
  { mesonId: "meson-4.0", mesonName: "Meson 4.0", category: "live", providerId: "gemini", providerModelId: "gemini-3.5-live-translate-preview", declaredStability: "preview", blurb: "เสียงสด + แปลภาษาแบบเรียลไทม์" },
  { mesonId: "meson-4.1", mesonName: "Meson 4.1", category: "live", providerId: "gemini", providerModelId: "gemini-3.1-flash-live-preview", declaredStability: "preview", blurb: "สนทนาเสียงสดทั่วไป" },

  // 5.x — Text-to-Speech
  { mesonId: "meson-5.0", mesonName: "Meson 5.0", category: "tts", providerId: "gemini", providerModelId: "gemini-3.1-flash-tts-preview", declaredStability: "preview", blurb: "แปลงข้อความเป็นเสียง" },

  // 6.x — Video Generation / Editing
  { mesonId: "meson-6.0", mesonName: "Meson 6.0", category: "video", providerId: "gemini", providerModelId: "gemini-omni-flash-preview", declaredStability: "experimental", blurb: "สร้าง/แก้ไขวิดีโอ" },

  // 7.x — Embeddings / Semantic Search / RAG
  { mesonId: "meson-7.0", mesonName: "Meson 7.0", category: "embedding", providerId: "gemini", providerModelId: "gemini-embedding-2-preview", declaredStability: "preview", blurb: "Embedding รุ่นล่าสุด" },
  { mesonId: "meson-7.1", mesonName: "Meson 7.1", category: "embedding", providerId: "gemini", providerModelId: "gemini-embedding-001", declaredStability: "stable", blurb: "Embedding รุ่นเสถียร" },

  // 8.x — Robotics / Physical AI
  { mesonId: "meson-8.0", mesonName: "Meson 8.0", category: "robotics", providerId: "gemini", providerModelId: "gemini-robotics-er-2-preview", declaredStability: "preview", blurb: "หุ่นยนต์ / Physical AI รุ่นล่าสุด" },
  { mesonId: "meson-8.1", mesonName: "Meson 8.1", category: "robotics", providerId: "gemini", providerModelId: "gemini-robotics-er-1.6-preview", declaredStability: "preview", blurb: "หุ่นยนต์ / Physical AI" },
];
