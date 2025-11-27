import { SETTINGS_METADATA } from "../constants/settings-metadata";
import { PrismaSettingsRepository } from "../repositories/prisma-settings.repository";

export class SettingsService {
  private readonly repo: PrismaSettingsRepository;

  constructor() {
    this.repo = new PrismaSettingsRepository();
  }

  async getString(key: string, fallback?: string): Promise<string> {
    const value = await this.repo.get(key);
    if (value !== undefined) return value;

    if (fallback !== undefined) return fallback;

    const defaultValue = SETTINGS_METADATA[key]?.defaultValue;
    if (defaultValue !== undefined) return defaultValue;

    throw new Error(`Setting ${key} not found and no valid default value available`);
  }

  async getNumber(key: string, fallback?: number): Promise<number> {
    const value = await this.repo.get(key);
    if (value !== undefined) {
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
    }

    if (fallback !== undefined) return fallback;

    const defaultValue = SETTINGS_METADATA[key]?.defaultValue;
    if (defaultValue !== undefined) {
      const num = Number(defaultValue);
      if (!Number.isNaN(num)) return num;
    }

    throw new Error(`Setting ${key} not found and no valid default value available`);
  }

  async getBoolean(key: string, fallback?: boolean): Promise<boolean> {
    const value = await this.repo.get(key);
    if (value !== undefined) {
      return value === "true";
    }
    const defaultValue = SETTINGS_METADATA[key]?.defaultValue;
    return fallback ?? defaultValue === "true";
  }

  async setString(key: string, value: string): Promise<void> {
    await this.repo.set(key, value);
  }
}
