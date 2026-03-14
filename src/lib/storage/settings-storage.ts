// =============================================================================
// Settings Storage Service
// Handles persistence of user settings to localStorage
// =============================================================================

import { LocalStorageRepository, STORAGE_KEYS } from "./storage";
import type { AppSettings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

export class SettingsStorage {
  private repository = new LocalStorageRepository<AppSettings>();
  private readonly KEY = STORAGE_KEYS.SETTINGS;

  // Load settings with defaults
  async load(): Promise<AppSettings> {
    const settings = await this.repository.get(this.KEY);
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  // Save settings
  async save(settings: Partial<AppSettings>): Promise<void> {
    const current = await this.load();
    const updated = { ...current, ...settings };
    await this.repository.set(this.KEY, updated);
  }

  // Reset to defaults
  async reset(): Promise<void> {
    await this.repository.set(this.KEY, DEFAULT_SETTINGS);
  }

  // Get single setting
  async get<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
    const settings = await this.load();
    return settings[key];
  }

  // Set single setting
  async set<K extends keyof AppSettings>(key: K, value: AppSettings[K]): Promise<void> {
    await this.save({ [key]: value });
  }
}

// Export singleton instance
export const settingsStorage = new SettingsStorage();
