import { createOpenAICompatChatProxy } from "./openai-compat-chat";

/**
 * Pollinations' unified "Gen" gateway — OpenAI-compatible chat completions
 * (confirmed against Pollinations' own API docs: base URL
 * `https://gen.pollinations.ai/v1`, `POST /chat/completions`, `Authorization:
 * Bearer sk_...`). Shared secret token only for now (see plan doc — BYOP
 * OAuth is a possible future phase, not implemented here).
 */
export const proxyPollinationsChat = createOpenAICompatChatProxy("https://gen.pollinations.ai/v1/chat/completions");
