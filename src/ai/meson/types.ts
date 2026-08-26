/**
 * Meson Model Registry — types.
 *
 * "Meson" is this app's own model brand. Every Meson id maps to exactly one
 * real provider model (enforced by registry.ts). Users see the Meson name;
 * the real provider/model id is backend metadata, optionally surfaced small
 * in the UI, never presented as if Meson were the original model maker.
 */

export type MesonCategory =
  | "chat" // 1.x — General / Chat / Multimodal / Fast
  | "pro" // 2.x — Pro / Reasoning / Coding
  | "image" // 3.x — Image Generation / Editing
  | "live" // 4.x — Live / Realtime Voice / Speech Translation
  | "tts" // 5.x — Text-to-Speech
  | "video" // 6.x — Video Generation / Editing
  | "embedding" // 7.x — Embeddings / Semantic Search / RAG
  | "robotics"; // 8.x — Robotics / Physical AI

export const CATEGORY_LABELS_TH: Record<MesonCategory, string> = {
  chat: "แชท / มัลติโมดัล / เร็ว",
  pro: "โปร / เหตุผลเชิงลึก / โค้ด",
  image: "สร้าง/แก้ไขรูปภาพ",
  live: "เสียงสด / แปลภาษาแบบเรียลไทม์",
  tts: "แปลงข้อความเป็นเสียง",
  video: "สร้าง/แก้ไขวิดีโอ",
  embedding: "Embeddings / ค้นหาความหมาย / RAG",
  robotics: "หุ่นยนต์ / Physical AI",
};

/**
 * Declared status is only a fallback hint written by hand when a Meson entry
 * is added. It is NOT trusted as ground truth — availability.ts checks the
 * live Gemini models.list/models.get response every time the registry is
 * read and overrides this when the provider gives us better information
 * (e.g. the model no longer exists → "unavailable", regardless of what's
 * declared here). This satisfies the "never hardcode availability forever"
 * requirement: the config only records intent, not live truth.
 */
export type DeclaredStability = "stable" | "preview" | "experimental";

export type LiveStatus = "stable" | "preview" | "experimental" | "unavailable" | "unknown";

/** Every backend a Meson entry can be bound to. Add new ids here first when onboarding a provider. */
export type MesonProviderId = "gemini" | "mistral";

/** Display label for the real backend, used where the UI shows "Meson X.X — <backend>" for transparency. */
export const PROVIDER_LABELS: Record<MesonProviderId, string> = {
  gemini: "Gemini",
  mistral: "Mistral",
};

export interface MesonEntry {
  /** Stable id used in URLs/requests, e.g. "meson-1.0". Never reused for a different backing model. */
  mesonId: string;
  /** Display name, e.g. "Meson 1.0". */
  mesonName: string;
  category: MesonCategory;
  /** Which provider backs this entry — gemini or mistral today. */
  providerId: MesonProviderId;
  /** The real, provider-side model id. Exactly one Meson entry may reference a given (providerId, providerModelId) pair. */
  providerModelId: string;
  declaredStability: DeclaredStability;
  /** The real model's display name (not a function description — the category already implies that), shown in the picker. e.g. "Gemini 3.7 Flash", "Mistral Medium 3.5". */
  blurb: string;
}

/** What the API/UI actually consumes: registry entry + live-checked status. */
export interface MesonModelInfo extends Omit<MesonEntry, "providerModelId"> {
  status: LiveStatus;
  /** Real provider model id — only included when the caller is allowed to see it (see reveal flag in the API route). */
  providerModelId?: string;
}
