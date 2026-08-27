import type { MesonEntry } from "./types";

/**
 * Source of truth for Meson ↔ real-provider mapping (Gemini, Mistral).
 *
 * RULES (enforced by registry.ts, not just convention):
 *   - 1 Meson entry = 1 (providerId, providerModelId) pair — the pair is
 *     scoped per provider, so e.g. "gemini:x" and "mistral:x" can coexist.
 *   - The same (providerId, providerModelId) pair must never appear twice.
 *     registry.ts throws at load time if it does — this is intentional, do
 *     not silence it.
 *   - To change a mapping, edit this file and redeploy. There is no runtime
 *     edit path (see /app/admin/meson — view only, by design).
 *   - declaredStability is a fallback hint only; live availability always
 *     wins (see availability.ts).
 *   - Numbering: new entries are appended after the highest existing id in
 *     their category — never renumber or move an existing entry.
 *   - blurb is the real model's display name (not a function description —
 *     the category itself already says what the model is for; see
 *     CATEGORY_LABELS_TH in types.ts).
 */
export const MESON_REGISTRY: MesonEntry[] = [
  // 1.x — General / Chat / Multimodal / Fast
  { mesonId: "meson-1.0", mesonName: "Meson 1.0", category: "chat", providerId: "gemini", providerModelId: "gemini-3.7-flash", declaredStability: "stable", blurb: "Gemini 3.7 Flash" },
  { mesonId: "meson-1.1", mesonName: "Meson 1.1", category: "chat", providerId: "gemini", providerModelId: "gemini-3.6-flash", declaredStability: "stable", blurb: "Gemini 3.6 Flash" },
  { mesonId: "meson-1.2", mesonName: "Meson 1.2", category: "chat", providerId: "gemini", providerModelId: "gemini-3.5-flash", declaredStability: "stable", blurb: "Gemini 3.5 Flash" },
  { mesonId: "meson-1.3", mesonName: "Meson 1.3", category: "chat", providerId: "gemini", providerModelId: "gemini-3.5-flash-lite", declaredStability: "stable", blurb: "Gemini 3.5 Flash Lite" },
  { mesonId: "meson-1.4", mesonName: "Meson 1.4", category: "chat", providerId: "gemini", providerModelId: "gemini-3.1-flash-lite", declaredStability: "stable", blurb: "Gemini 3.1 Flash Lite" },

  // 1.5–1.10 — Mistral general/chat family (BYOK/shared via MISTRAL_API_KEY)
  { mesonId: "meson-1.5", mesonName: "Meson 1.5", category: "chat", providerId: "mistral", providerModelId: "mistral-medium-3-5", declaredStability: "stable", blurb: "Mistral Medium 3.5" },
  { mesonId: "meson-1.6", mesonName: "Meson 1.6", category: "chat", providerId: "mistral", providerModelId: "mistral-small-2603", declaredStability: "stable", blurb: "Mistral Small 4" },
  { mesonId: "meson-1.7", mesonName: "Meson 1.7", category: "chat", providerId: "mistral", providerModelId: "mistral-large-2512", declaredStability: "stable", blurb: "Mistral Large 3" },
  { mesonId: "meson-1.8", mesonName: "Meson 1.8", category: "chat", providerId: "mistral", providerModelId: "ministral-14b-2512", declaredStability: "stable", blurb: "Ministral 3 14B" },
  { mesonId: "meson-1.9", mesonName: "Meson 1.9", category: "chat", providerId: "mistral", providerModelId: "ministral-8b-2512", declaredStability: "stable", blurb: "Ministral 3 8B" },
  { mesonId: "meson-1.10", mesonName: "Meson 1.10", category: "chat", providerId: "mistral", providerModelId: "ministral-3b-2512", declaredStability: "stable", blurb: "Ministral 3 3B" },

  // 1.11–1.13 — Pollinations general/chat family (shared token via POLLINATIONS_API_KEY;
  // model ids are Pollinations' own aliases, confirmed live against their
  // API docs — DeepSeek is intentionally excluded per policy even though
  // Pollinations offers it, see registry.config.ts header rules)
  { mesonId: "meson-1.11", mesonName: "Meson 1.11", category: "chat", providerId: "pollinations", providerModelId: "openai-fast", declaredStability: "stable", blurb: "GPT-5 Nano" },
  { mesonId: "meson-1.12", mesonName: "Meson 1.12", category: "chat", providerId: "pollinations", providerModelId: "openai", declaredStability: "stable", blurb: "GPT-5.4 Nano" },
  { mesonId: "meson-1.13", mesonName: "Meson 1.13", category: "chat", providerId: "pollinations", providerModelId: "grok", declaredStability: "stable", blurb: "Grok 4.20" },

  // 2.x — Pro / Reasoning / Coding
  { mesonId: "meson-2.0", mesonName: "Meson 2.0", category: "pro", providerId: "gemini", providerModelId: "gemini-3.1-pro-preview", declaredStability: "preview", blurb: "Gemini 3.1 Pro (Preview)" },
  { mesonId: "meson-2.1", mesonName: "Meson 2.1", category: "pro", providerId: "gemini", providerModelId: "gemini-3-flash-preview", declaredStability: "preview", blurb: "Gemini 3 Flash (Preview)" },
  { mesonId: "meson-2.2", mesonName: "Meson 2.2", category: "pro", providerId: "mistral", providerModelId: "codestral-2508", declaredStability: "stable", blurb: "Codestral" },
  { mesonId: "meson-2.3", mesonName: "Meson 2.3", category: "pro", providerId: "pollinations", providerModelId: "openai-large", declaredStability: "stable", blurb: "GPT-5.4" },
  { mesonId: "meson-2.4", mesonName: "Meson 2.4", category: "pro", providerId: "pollinations", providerModelId: "qwen-coder", declaredStability: "stable", blurb: "Qwen3 Coder 30B" },

  // 3.x — Image Generation / Editing
  { mesonId: "meson-3.0", mesonName: "Meson 3.0", category: "image", providerId: "gemini", providerModelId: "gemini-3.1-flash-image", declaredStability: "stable", blurb: "Gemini 3.1 Flash Image" },
  { mesonId: "meson-3.1", mesonName: "Meson 3.1", category: "image", providerId: "gemini", providerModelId: "gemini-3.1-flash-lite-image", declaredStability: "stable", blurb: "Gemini 3.1 Flash Lite Image" },
  { mesonId: "meson-3.2", mesonName: "Meson 3.2", category: "image", providerId: "gemini", providerModelId: "gemini-3-pro-image", declaredStability: "stable", blurb: "Gemini 3 Pro Image" },

  // 4.x — Live / Realtime Voice / Speech Translation
  { mesonId: "meson-4.0", mesonName: "Meson 4.0", category: "live", providerId: "gemini", providerModelId: "gemini-3.5-live-translate-preview", declaredStability: "preview", blurb: "Gemini 3.5 Live Translate (Preview)" },
  { mesonId: "meson-4.1", mesonName: "Meson 4.1", category: "live", providerId: "gemini", providerModelId: "gemini-3.1-flash-live-preview", declaredStability: "preview", blurb: "Gemini 3.1 Flash Live (Preview)" },

  // 5.x — Text-to-Speech
  { mesonId: "meson-5.0", mesonName: "Meson 5.0", category: "tts", providerId: "gemini", providerModelId: "gemini-3.1-flash-tts-preview", declaredStability: "preview", blurb: "Gemini 3.1 Flash TTS (Preview)" },

  // 6.x — Video Generation / Editing
  { mesonId: "meson-6.0", mesonName: "Meson 6.0", category: "video", providerId: "gemini", providerModelId: "gemini-omni-flash-preview", declaredStability: "experimental", blurb: "Gemini Omni Flash (Experimental)" },

  // 7.x — Embeddings / Semantic Search / RAG
  { mesonId: "meson-7.0", mesonName: "Meson 7.0", category: "embedding", providerId: "gemini", providerModelId: "gemini-embedding-2-preview", declaredStability: "preview", blurb: "Gemini Embedding 2 (Preview)" },
  { mesonId: "meson-7.1", mesonName: "Meson 7.1", category: "embedding", providerId: "gemini", providerModelId: "gemini-embedding-001", declaredStability: "stable", blurb: "Gemini Embedding 001" },

  // 8.x — Robotics / Physical AI
  { mesonId: "meson-8.0", mesonName: "Meson 8.0", category: "robotics", providerId: "gemini", providerModelId: "gemini-robotics-er-2-preview", declaredStability: "preview", blurb: "Gemini Robotics-ER 2 (Preview)" },
  { mesonId: "meson-8.1", mesonName: "Meson 8.1", category: "robotics", providerId: "gemini", providerModelId: "gemini-robotics-er-1.6-preview", declaredStability: "preview", blurb: "Gemini Robotics-ER 1.6 (Preview)" },
];

/**
 * Meson ids pulled from the model picker and blocked at the chat API,
 * without touching/removing the MESON_REGISTRY entries above — re-enabling
 * is a one-line revert here. Add/remove ids as needed; never edit the
 * registry entries themselves for this.
 */
export const TEMPORARILY_DISABLED_MESON_IDS = new Set<string>(["meson-1.0"]);
