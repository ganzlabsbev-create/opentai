import type { MesonProviderId } from "@/ai/meson/types";
import type { ChatProxy } from "./types";
import { proxyGeminiChat } from "./gemini-chat";
import { proxyMistralChat } from "./mistral-chat";

export type { ChatProxy, ProxyChatParams, ProxyChatMessage } from "./types";

/** One chat proxy per backend a Meson entry can reference — see meson/types.ts MesonProviderId. */
export const CHAT_PROXIES: Record<MesonProviderId, ChatProxy> = {
  gemini: proxyGeminiChat,
  mistral: proxyMistralChat,
};
