import { ALL_PROVIDERS, getProvider } from "@/ai/providers";
import type { AIChatMessage } from "@/ai/providers/types";
import { AppError } from "@/types/errors";
import type { AppSettings } from "@/types/settings";

export interface RouteGenerateParams {
  messages: AIChatMessage[];
  context?: string;
  settings: AppSettings;
  signal?: AbortSignal;
  onProviderSelected?: (providerId: string, modelId: string) => void;
  onProviderFallback?: (fromProviderId: string, error: AppError) => void;
}

function buildChain(settings: AppSettings): string[] {
  const ids = [settings.defaultProviderId, ...ALL_PROVIDERS.map((p) => p.id)];
  const seen = new Set<string>();
  const chain: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const provider = getProvider(id);
    if (!provider) continue;
    if (settings.localOnly && provider.requiresApiKey) continue;
    chain.push(id);
  }
  return chain;
}

function pickModelId(providerId: string, settings: AppSettings): string {
  const provider = getProvider(providerId);
  if (!provider) throw new AppError("MODEL_UNAVAILABLE");
  if (providerId === settings.defaultProviderId && provider.models.some((m) => m.id === settings.defaultModelId)) {
    return settings.defaultModelId;
  }
  return provider.models[0]?.id ?? settings.defaultModelId;
}

/**
 * Provider selection + fallback chain — ThaiAI_Phase2_Prompt.md item 6.
 * Yields cumulative response text (accumulated from each provider's
 * incremental deltas) so consumers can just render the latest yielded
 * value, matching the old `onChunk(cumulativeText, done)` contract.
 */
export async function* routeGenerate(
  params: RouteGenerateParams
): AsyncGenerator<string, { providerId: string; modelId: string }, unknown> {
  const { messages, context, settings, signal, onProviderSelected, onProviderFallback } = params;
  const chain = buildChain(settings);

  if (chain.length === 0) {
    throw new AppError("PROVIDER_UNAVAILABLE", "ไม่มีผู้ให้บริการที่ใช้งานได้ (โหมด local-only ปิดการเชื่อมต่อภายนอกไว้)");
  }

  const candidates = settings.autoRouting ? chain : chain.slice(0, 1);
  let lastError: AppError | null = null;

  for (let attempt = 0; attempt < candidates.length; attempt++) {
    const providerId = candidates[attempt]!;
    const provider = getProvider(providerId);
    if (!provider) continue;

    const apiKey = settings.apiKeys[providerId];
    if (provider.requiresApiKey && !provider.isConfigured(apiKey)) {
      lastError = new AppError("INVALID_API_KEY", `ยังไม่ได้ตั้งค่า API key สำหรับ ${provider.name}`);
      continue;
    }

    const modelId = pickModelId(providerId, settings);
    onProviderSelected?.(providerId, modelId);

    let cumulative = "";
    try {
      for await (const delta of provider.generateStream({ messages, context, modelId, signal }, apiKey)) {
        cumulative += delta;
        yield cumulative;
      }
      return { providerId, modelId };
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      const appErr = AppError.from(err);
      lastError = appErr;
      const isLastCandidate = attempt === candidates.length - 1;
      if (!isLastCandidate) {
        onProviderFallback?.(providerId, appErr);
        continue;
      }
      throw appErr;
    }
  }

  throw lastError ?? new AppError("PROVIDER_UNAVAILABLE");
}
