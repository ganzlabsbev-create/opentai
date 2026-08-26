import { createOpenAICompatChatProxy } from "./openai-compat-chat";

/** Mistral's La Plateforme API — OpenAI-compatible chat completions. */
export const proxyMistralChat = createOpenAICompatChatProxy("https://api.mistral.ai/v1/chat/completions");
