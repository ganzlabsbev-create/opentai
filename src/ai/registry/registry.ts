import { ALL_PROVIDERS } from "@/ai/providers";
import type { ModelInfo, ProviderInfo } from "@/types/ai";
import type { AppSettings } from "@/types/settings";

/**
 * Derives the UI-facing provider/model lists from the real `ai/providers`
 * registry plus current settings (API key presence) — replaces the old
 * static placeholder arrays.
 */
export function deriveProviders(settings: AppSettings): ProviderInfo[] {
  return ALL_PROVIDERS.map((p) => ({
    id: p.id,
    name: p.name,
    desc: p.desc,
    status: p.isConfigured(settings.apiKeys[p.id]) ? "connected" : "not_connected",
    requiresApiKey: p.requiresApiKey,
  }));
}

export function deriveModels(settings: AppSettings): ModelInfo[] {
  return ALL_PROVIDERS.flatMap((p) =>
    p.models.map((m) => ({
      id: m.id,
      provider: p.id,
      name: m.name,
      capability: m.capability,
      context: m.context,
      ready: p.isConfigured(settings.apiKeys[p.id]),
      supportsVision: m.supportsVision ?? false,
    }))
  );
}
