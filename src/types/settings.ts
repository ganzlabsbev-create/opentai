export type ThemeName = "light" | "dark";

export interface AppSettings {
  language: "th";
  fontSize: "normal" | "large";
  /** When true, the router skips network providers entirely (no BYOK calls leave the browser). */
  localOnly: boolean;
  /** When true, the router falls back to the next provider on failure instead of erroring immediately. */
  autoRouting: boolean;
  devMode: boolean;
  defaultProviderId: string;
  defaultModelId: string;
  /**
   * When true, the app uses Meson 7.x (/api/meson/embed) to generate
   * embeddings for the existing context/RAG pipeline (src/core/context,
   * src/core/search) instead of the plain keyword-matching search it uses
   * today. Off by default: this only flips the setting on — actually
   * wiring embedding-based retrieval into assembleContext/search is a
   * separate follow-up, not implied by this toggle alone.
   */
  useMesonEmbeddingsForContext: boolean;
  /** BYOK keys, keyed by provider id. Stored as-is in IndexedDB (local device only); UI always masks them. */
  apiKeys: Record<string, string>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "th",
  fontSize: "normal",
  localOnly: false,
  autoRouting: true,
  devMode: false,
  defaultProviderId: "meson",
  defaultModelId: "meson-1.0",
  useMesonEmbeddingsForContext: false,
  apiKeys: {},
};
