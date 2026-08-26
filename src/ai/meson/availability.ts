import type { MesonEntry, LiveStatus, MesonProviderId } from "./types";

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min — no cron in phase 1, so this just avoids re-checking on every request within a warm instance.

interface CacheEntry {
  fetchedAt: number;
  availableIds: Set<string> | null; // null = last fetch failed, we don't know
}

// Module-level cache, one slot per provider. Serverless instances are
// ephemeral, so this is best-effort (helps warm invocations, resets on cold
// start) — acceptable for phase 1 per the "static config + no separate cron"
// decision.
const cache: Partial<Record<MesonProviderId, CacheEntry>> = {};

/** Optional per-provider API key used only for the live model.list() check — the actual chat proxy resolves its own key independently. */
export type AvailabilityKeys = Partial<Record<MesonProviderId, string>>;

async function fetchGeminiModelIds(apiKey: string): Promise<Set<string> | null> {
  const GEMINI_LIST_URL = "https://generativelanguage.googleapis.com/v1beta/models";
  try {
    const ids = new Set<string>();
    let pageToken: string | undefined;

    do {
      const url = new URL(GEMINI_LIST_URL);
      url.searchParams.set("key", apiKey);
      url.searchParams.set("pageSize", "100");
      if (pageToken) url.searchParams.set("pageToken", pageToken);

      const res = await fetch(url.toString(), { method: "GET" });
      if (!res.ok) {
        console.error(`[meson/availability] gemini models.list failed: ${res.status} ${res.statusText}`);
        return null;
      }
      const data = (await res.json()) as { models?: { name: string }[]; nextPageToken?: string };
      for (const m of data.models ?? []) {
        // Google returns "models/gemini-3.7-flash" — strip the prefix to match our config ids.
        ids.add(m.name.replace(/^models\//, ""));
      }
      pageToken = data.nextPageToken;
    } while (pageToken);

    return ids;
  } catch (err) {
    console.error("[meson/availability] gemini models.list threw:", err);
    return null;
  }
}

/** Mistral's La Plateforme model list — OpenAI-compatible `GET /v1/models`, returns `{ data: [{ id: string }] }`. */
async function fetchMistralModelIds(apiKey: string): Promise<Set<string> | null> {
  try {
    const res = await fetch("https://api.mistral.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(`[meson/availability] mistral models list failed: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = (await res.json()) as { data?: { id: string }[] };
    return new Set((data.data ?? []).map((m) => m.id));
  } catch (err) {
    console.error("[meson/availability] mistral models list threw:", err);
    return null;
  }
}

/** Pollinations' unified Gen gateway — OpenAI-compatible `GET /v1/models`, returns `{ data: [{ id: string }] }`, same shape as Mistral's. */
async function fetchPollinationsModelIds(apiKey: string): Promise<Set<string> | null> {
  try {
    const res = await fetch("https://gen.pollinations.ai/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      console.error(`[meson/availability] pollinations models list failed: ${res.status} ${res.statusText}`);
      return null;
    }
    const data = (await res.json()) as { data?: { id: string }[] };
    return new Set((data.data ?? []).map((m) => m.id));
  } catch (err) {
    console.error("[meson/availability] pollinations models list threw:", err);
    return null;
  }
}

const FETCHERS: Record<MesonProviderId, (apiKey: string) => Promise<Set<string> | null>> = {
  gemini: fetchGeminiModelIds,
  mistral: fetchMistralModelIds,
  pollinations: fetchPollinationsModelIds,
};

async function getAvailableModelIds(providerId: MesonProviderId, apiKey: string): Promise<Set<string> | null> {
  const now = Date.now();
  const cached = cache[providerId];
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.availableIds;
  }
  const availableIds = await FETCHERS[providerId](apiKey);
  cache[providerId] = { fetchedAt: now, availableIds };
  return availableIds;
}

/**
 * Resolves live status for every registry entry against its own provider's
 * current model list. A model missing from the live list is marked
 * "unavailable" (covers both real shutdowns and typos in the config —
 * either way it must not be offered to normal users). If the live check
 * itself fails (or no key was supplied for that provider), we fail open and
 * use the declared stability instead of hiding everything; if a provider
 * simply has no key configured at all, its entries report "unknown"
 * (matches the pre-existing behavior for "future providers").
 */
export async function resolveLiveStatuses(entries: MesonEntry[], keys: AvailabilityKeys): Promise<Map<string, LiveStatus>> {
  const result = new Map<string, LiveStatus>();
  const byProvider = new Map<MesonProviderId, MesonEntry[]>();
  for (const entry of entries) {
    const list = byProvider.get(entry.providerId) ?? [];
    list.push(entry);
    byProvider.set(entry.providerId, list);
  }

  for (const [providerId, providerEntries] of byProvider) {
    const apiKey = keys[providerId];
    if (!apiKey) {
      for (const entry of providerEntries) result.set(entry.mesonId, "unknown");
      continue;
    }

    const availableIds = await getAvailableModelIds(providerId, apiKey);
    for (const entry of providerEntries) {
      if (availableIds === null) {
        // live check unavailable — fail open using declared status, don't hide the model
        result.set(entry.mesonId, entry.declaredStability);
        continue;
      }
      result.set(entry.mesonId, availableIds.has(entry.providerModelId) ? entry.declaredStability : "unavailable");
    }
  }

  return result;
}
