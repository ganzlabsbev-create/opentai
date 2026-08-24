"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { deriveModels } from "@/ai/registry/registry";
import { useSettings } from "@/features/settings/store/SettingsProvider";

interface ModelSelectionCtxValue {
  selectedModel: string;
  setSelectedModel: (name: string) => void;
}

const ModelSelectionContext = createContext<ModelSelectionCtxValue | null>(null);

/**
 * Thin view over `AppSettings.defaultProviderId`/`defaultModelId` — the
 * selection itself now lives in real IndexedDB-backed settings (via
 * SettingsProvider) instead of transient component state, so it survives
 * reloads and drives `ai/router`'s default candidate.
 */
export function ModelSelectionProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings } = useSettings();
  const models = useMemo(() => deriveModels(settings), [settings]);

  const current = models.find((m) => m.provider === settings.defaultProviderId && m.id === settings.defaultModelId);
  const selectedModel = current?.name ?? models[0]?.name ?? "ยังไม่ได้เลือกโมเดล";

  const setSelectedModel = useCallback(
    (name: string) => {
      const target = models.find((m) => m.name === name);
      if (!target) return;
      updateSettings({ defaultProviderId: target.provider, defaultModelId: target.id });
    },
    [models, updateSettings]
  );

  return <ModelSelectionContext.Provider value={{ selectedModel, setSelectedModel }}>{children}</ModelSelectionContext.Provider>;
}

export function useModelSelection() {
  const ctx = useContext(ModelSelectionContext);
  if (!ctx) throw new Error("useModelSelection must be used within ModelSelectionProvider");
  return ctx;
}
