import { MESON_REGISTRY } from "./registry.config";
import type { MesonEntry, MesonCategory } from "./types";

/**
 * Validates MESON_REGISTRY at module load time.
 * Throws immediately (fails the build / cold start) if:
 *   - a mesonId is duplicated
 *   - a (providerId, providerModelId) pair backs more than one Meson entry
 * This is the enforcement of "1 Meson = 1 Gemini model, never shared" —
 * it is not just a naming convention, a bad config cannot ship.
 */
function validateRegistry(entries: MesonEntry[]): void {
  const seenMesonIds = new Set<string>();
  const seenProviderPairs = new Set<string>();

  for (const entry of entries) {
    if (seenMesonIds.has(entry.mesonId)) {
      throw new Error(`[meson/registry] duplicate mesonId: "${entry.mesonId}"`);
    }
    seenMesonIds.add(entry.mesonId);

    const providerKey = `${entry.providerId}:${entry.providerModelId}`;
    if (seenProviderPairs.has(providerKey)) {
      throw new Error(
        `[meson/registry] model "${entry.providerModelId}" (provider "${entry.providerId}") is already bound to another Meson entry — 1 Meson = 1 model is required.`
      );
    }
    seenProviderPairs.add(providerKey);
  }
}

validateRegistry(MESON_REGISTRY);

export function getAllMesonEntries(): MesonEntry[] {
  return MESON_REGISTRY;
}

export function getMesonEntry(mesonId: string): MesonEntry | undefined {
  return MESON_REGISTRY.find((e) => e.mesonId === mesonId);
}

export function getMesonEntriesByCategory(category: MesonCategory): MesonEntry[] {
  return MESON_REGISTRY.filter((e) => e.category === category);
}

/** Look up which Meson entry (if any) backs a given raw provider model id — useful for logging/debugging only. */
export function findMesonByProviderModel(providerId: string, providerModelId: string): MesonEntry | undefined {
  return MESON_REGISTRY.find((e) => e.providerId === providerId && e.providerModelId === providerModelId);
}
