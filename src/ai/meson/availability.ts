import type { MesonEntry, LiveStatus } from "./types";

const GEMINI_LIST_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 min — no cron in phase 1, so this just avoids re-checking on every request within a warm instance.

interface CacheEntry {
  fetchedAt: number;
  availableIds: Set<string> | null; // null = last fetch failed, we don't know
}

// Module-level cache. Serverless instances are ephemeral, so this is
// best-effort (helps warm invocations, resets on cold start) — acceptable
// for phase 1 per the "static config + no separate cron" decision.
let cache: CacheEntry | null = null;

/**
 * Calls Gemini models.list (paginated) and returns the set of raw model ids
 * Google currently reports as existing. Never throws — on any failure it
 * returns null so callers can fail open (fall back to declared status)
 * instead of marking every Meson entry unavailable because of a transient
 * network/API hiccup.
 */
async function fetchAvailableModelIds(apiKey: string): Promise<Set<string> | null> {
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
        console.error(`[meson/availability] models.list failed: ${res.status} ${res.statusText}`);
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
    console.error("[meson/availability] models.list threw:", err);
    return null;
  }
}

async function getAvailableModelIds(apiKey: string): Promise<Set<string> | null> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.availableIds;
  }
  const availableIds = await fetchAvailableModelIds(apiKey);
  cache = { fetchedAt: now, availableIds };
  return availableIds;
}

/**
 * Resolves live status for every registry entry against Gemini's current
 * model list. A model missing from the live list is marked "unavailable"
 * (covers both real shutdowns and typos in the config — either way it must
 * not be offered to normal users). If the live check itself fails, we fail
 * open and use the declared stability instead of hiding everything.
 */
export async function resolveLiveStatuses(
  entries: MesonEntry[],
  apiKey: string
): Promise<Map<string, LiveStatus>> {
  const availableIds = await getAvailableModelIds(apiKey);
  const result = new Map<string, LiveStatus>();

  for (const entry of entries) {
    if (entry.providerId !== "gemini") {
      result.set(entry.mesonId, "unknown"); // future providers plug in here
      continue;
    }
    if (availableIds === null) {
      // live check unavailable — fail open using declared status, don't hide the model
      result.set(entry.mesonId, entry.declaredStability);
      continue;
    }
    result.set(entry.mesonId, availableIds.has(entry.providerModelId) ? entry.declaredStability : "unavailable");
  }

  return result;
}
