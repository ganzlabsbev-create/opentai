export type ProviderStatus = "connected" | "not_connected";

/** UI-facing summary of a provider, derived at runtime from ai/providers + settings. */
export interface ProviderInfo {
  id: string;
  name: string;
  desc: string;
  status: ProviderStatus;
  requiresApiKey: boolean;
}

export interface ModelInfo {
  id: string;
  provider: string;
  name: string;
  capability: string;
  context: string;
  ready: boolean;
  supportsVision: boolean;
}
