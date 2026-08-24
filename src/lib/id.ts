/**
 * Generates a reasonably unique client-side id. Replaces the prototype's
 * `let idc = 1000; const nid = () => \`id-${idc++}\`` — that pattern resets
 * on every reload/module re-eval and isn't safe once ids need to persist
 * (IndexedDB keys) or survive route navigation in Phase 3.
 */
export function nid(prefix = "id"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
