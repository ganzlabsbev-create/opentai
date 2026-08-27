import type { MesonCategory } from "@/ai/meson/types";

/**
 * Display config for the Models page (/models) — grouped-by-category view of
 * ALL Meson categories 1–8, replacing the old flat "chat/pro models + link
 * out to other tools" layout. Order here is the fixed 1–8 display order
 * (does not have to match declaration order in registry.config.ts).
 *
 * - number/shortLabel: short Thai heading, e.g. "Meson 1 · แชททั่วไป".
 *   Deliberately terser than CATEGORY_LABELS_TH (types.ts), which is the
 *   fuller/more precise label used elsewhere.
 * - selectable: true for categories usable as the default chat model
 *   (1.x/2.x, via MesonProvider → /api/meson/chat). Others aren't a chat
 *   model at all — no "select" affordance for those, just info + a link to
 *   their Studio page when one exists (see studioHref).
 * - studioHref: dedicated Studio page for that category, or undefined when
 *   none exists yet (embedding/7.x is backend/RAG-only, no Studio UI).
 */
export interface MesonCategoryDisplay {
  category: MesonCategory;
  number: number;
  shortLabel: string;
  selectable: boolean;
  studioHref?: string;
}

export const MESON_CATEGORY_DISPLAY: MesonCategoryDisplay[] = [
  { category: "chat", number: 1, shortLabel: "แชททั่วไป", selectable: true },
  { category: "pro", number: 2, shortLabel: "โปร / โค้ด", selectable: true },
  { category: "image", number: 3, shortLabel: "สร้าง/แก้ไขรูปภาพ", selectable: false, studioHref: "/meson/image" },
  { category: "live", number: 4, shortLabel: "เสียงสด", selectable: false, studioHref: "/meson/live" },
  { category: "tts", number: 5, shortLabel: "แปลงข้อความเป็นเสียง", selectable: false, studioHref: "/meson/tts" },
  { category: "video", number: 6, shortLabel: "วิดีโอ", selectable: false, studioHref: "/meson/video" },
  { category: "embedding", number: 7, shortLabel: "Embeddings / RAG", selectable: false },
  { category: "robotics", number: 8, shortLabel: "หุ่นยนต์ / Physical AI", selectable: false, studioHref: "/meson/robotics" },
];
