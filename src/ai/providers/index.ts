/**
 * AIProvider interface + MockProvider/GeminiProvider implementations —
 * ThaiAI_Phase2_Prompt.md item 6. CerebrasProvider is not implemented yet
 * (only Gemini was required as the first real BYOK adapter); it's simply
 * absent from this registry rather than present as a fake entry.
 */
export type { AIProvider, AIChatMessage, AIModelDef, GenerateParams } from "@/ai/providers/types";
export { MockProvider } from "@/ai/providers/mock";
export { GeminiProvider } from "@/ai/providers/gemini";

import { MockProvider } from "@/ai/providers/mock";
import { GeminiProvider } from "@/ai/providers/gemini";
import type { AIProvider } from "@/ai/providers/types";

export const ALL_PROVIDERS: AIProvider[] = [MockProvider, GeminiProvider];

export function getProvider(id: string): AIProvider | undefined {
  return ALL_PROVIDERS.find((p) => p.id === id);
}
