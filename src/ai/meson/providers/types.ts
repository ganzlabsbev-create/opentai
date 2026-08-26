import type { MesonEntry } from "@/ai/meson/types";

/** Same wire shape as the client's existing chat body (see /api/meson/chat). */
export interface ProxyChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ProxyChatParams {
  entry: MesonEntry;
  apiKey: string;
  messages: ProxyChatMessage[];
  context?: string;
  signal?: AbortSignal;
}

/**
 * Every per-provider chat proxy returns a Response whose body is an SSE
 * stream of `data: {...}` lines shaped like the Gemini
 * `streamGenerateContent` chunk (`candidates[0].content.parts[].text`).
 * The client-side parser in `ai/providers/meson.ts` only understands this
 * one shape, so non-Gemini backends are translated into it server-side —
 * this keeps the client untouched when a new backend is added here.
 */
export type ChatProxy = (params: ProxyChatParams) => Promise<Response>;
