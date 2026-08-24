import { getDb } from "@/core/storage/db";
import { AppError } from "@/types/errors";
import { DEFAULT_SETTINGS, type AppSettings } from "@/types/settings";

const SETTINGS_KEY = "app";

export async function getSettings(): Promise<AppSettings> {
  try {
    const row = await getDb().settings.get(SETTINGS_KEY);
    if (!row) return DEFAULT_SETTINGS;
    // Merge over defaults so new fields introduced later don't crash old data.
    return { ...DEFAULT_SETTINGS, ...(row.value as Partial<AppSettings>) };
  } catch (err) {
    throw AppError.from(err);
  }
}

export async function setSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  try {
    const current = await getSettings();
    const next: AppSettings = { ...current, ...patch };
    await getDb().settings.put({ key: SETTINGS_KEY, value: next });
    return next;
  } catch (err) {
    if (err instanceof DOMException && err.name === "QuotaExceededError") {
      throw new AppError("STORAGE_FULL", undefined, err);
    }
    throw AppError.from(err);
  }
}

export async function resetSettings(): Promise<AppSettings> {
  try {
    await getDb().settings.put({ key: SETTINGS_KEY, value: DEFAULT_SETTINGS });
    return DEFAULT_SETTINGS;
  } catch (err) {
    throw AppError.from(err);
  }
}
