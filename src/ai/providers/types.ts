export interface AIChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AIModelDef {
  id: string;
  name: string;
  capability: string;
  context: string;
}

export interface GenerateParams {
  messages: AIChatMessage[];
  /** Assembled context text from core/context, prepended as system-ish guidance when present. */
  context?: string;
  modelId: string;
  signal?: AbortSignal;
}

/**
 * AIProvider interface — ThaiAI_Phase2_Prompt.md item 6. Implementations:
 * MockProvider (always available, no key) and GeminiProvider (BYOK). Every
 * implementation streams via an async generator so `ai/router` and
 * `useStreaming` don't need to know which provider is behind the call.
 */
export interface AIProvider {
  id: string;
  name: string;
  desc: string;
  requiresApiKey: boolean;
  models: AIModelDef[];
  isConfigured(apiKey?: string): boolean;
  /** Yields incremental text deltas (not cumulative) — the caller (ai/router) accumulates them. */
  generateStream(params: GenerateParams, apiKey?: string): AsyncGenerator<string, void, unknown>;
}
