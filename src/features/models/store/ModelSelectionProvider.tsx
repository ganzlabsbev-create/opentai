"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { deriveModels } from "@/ai/registry/registry";
import { useSettings } from "@/features/settings/store/SettingsProvider";

interface ModelSelectionCtxValue {
  selectedModel: string;
  setSelectedModel: (name: string) => void;
  /** Whether the currently selected chat model accepts image input. False (not undefined) when nothing is resolved yet, so callers can safely gate on it without an extra loading check. */
  selectedModelSupportsVision: boolean;
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
  const selectedModelSupportsVision = current?.supportsVision ?? false;

  const setSelectedModel = useCallback(
    (name: string) => {
      const target = models.find((m) => m.name === name);
      if (!target) return;
      updateSettings({ defaultProviderId: target.provider, defaultModelId: target.id });
    },
    [models, updateSettings]
  );

  return (
    <ModelSelectionContext.Provider value={{ selectedModel, setSelectedModel, selectedModelSupportsVision }}>
      {children}
    </ModelSelectionContext.Provider>
  );
}

export function useModelSelection() {
  const ctx = useContext(ModelSelectionContext);
  if (!ctx) throw new Error("useModelSelection must be used within ModelSelectionProvider");
  return ctx;
}
