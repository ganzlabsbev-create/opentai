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
  /** BYOK keys, keyed by provider id. Stored as-is in IndexedDB (local device only); UI always masks them. */
  apiKeys: Record<string, string>;
}

export const DEFAULT_SETTINGS: AppSettings = {
  language: "th",
  fontSize: "normal",
  localOnly: false,
  autoRouting: true,
  devMode: false,
  defaultProviderId: "mock",
  defaultModelId: "mock-v1",
  apiKeys: {},
};
