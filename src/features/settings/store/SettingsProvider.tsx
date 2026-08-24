"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { getSettings, resetSettings, setSettings as persistSettings } from "@/core/storage/settings";
import { clearAllStorage } from "@/core/storage";
import { clearAllFileBytes } from "@/core/files";
import { AppError } from "@/types/errors";
import { DEFAULT_SETTINGS, type AppSettings } from "@/types/settings";
import { useToast } from "@/components/ui/Toast";

interface SettingsCtxValue {
  settings: AppSettings;
  loaded: boolean;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  setApiKey: (providerId: string, key: string) => Promise<void>;
  clearApiKeys: () => Promise<void>;
  resetApp: () => Promise<void>;
}

const SettingsContext = createContext<SettingsCtxValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [settings, setSettingsState] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getSettings()
      .then(setSettingsState)
      .catch((err) => toast(AppError.from(err).userMessage, "danger"))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      try {
        const next = await persistSettings(patch);
        setSettingsState(next);
      } catch (err) {
        toast(AppError.from(err).userMessage, "danger");
      }
    },
    [toast]
  );

  const setApiKey = useCallback(
    async (providerId: string, key: string) => {
      await updateSettings({ apiKeys: { ...settings.apiKeys, [providerId]: key } });
    },
    [settings.apiKeys, updateSettings]
  );

  const clearApiKeys = useCallback(async () => {
    await updateSettings({ apiKeys: {} });
    toast("ล้าง API keys แล้ว");
  }, [toast, updateSettings]);

  const resetApp = useCallback(async () => {
    try {
      await clearAllStorage();
      await clearAllFileBytes();
      const next = await resetSettings();
      setSettingsState(next);
      toast("รีเซ็ตแอปแล้ว");
    } catch (err) {
      toast(AppError.from(err).userMessage, "danger");
    }
  }, [toast]);

  return (
    <SettingsContext.Provider value={{ settings, loaded, updateSettings, setApiKey, clearApiKeys, resetApp }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
