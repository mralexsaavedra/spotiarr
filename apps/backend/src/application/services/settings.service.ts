import type { SettingsPort } from "@/application/ports/settings.port";
import { SETTINGS_METADATA } from "@/constants/settings-metadata";
import { AppError } from "@/domain/errors/app-error";
import type { SettingsRepository } from "@/domain/repositories/settings.repository";

const INTERNALIZED_NUMERIC_SETTINGS = {
  FEED_SYNC_INTERVAL_MINUTES: "FEED_SYNC_INTERVAL_MINUTES",
  RELEASES_SYNC_INTERVAL_MINUTES: "RELEASES_SYNC_INTERVAL_MINUTES",
  CATALOG_SYNC_INTERVAL_HOURS: "CATALOG_SYNC_INTERVAL_HOURS",
  CATALOG_LOOKBACK_DAYS: "CATALOG_LOOKBACK_DAYS",
  MAX_ACTIVE_ARTISTS_PER_CYCLE: "MAX_ACTIVE_ARTISTS_PER_CYCLE",
  MAX_CATALOG_ARTISTS_PER_CYCLE: "MAX_CATALOG_ARTISTS_PER_CYCLE",
  FOLLOWED_ARTISTS_MAX: "FOLLOWED_ARTISTS_MAX",
  RELEASES_LOOKBACK_DAYS: "RELEASES_LOOKBACK_DAYS",
  RELEASES_CACHE_MINUTES: "RELEASES_CACHE_MINUTES",
  YT_SEARCH_CONCURRENCY: "YT_SEARCH_CONCURRENCY",
  YT_SEARCH_DELAY_MS: "YT_SEARCH_DELAY_MS",
  YT_DOWNLOADS_PER_MINUTE: "YT_DOWNLOADS_PER_MINUTE",
  STUCK_TRACKS_CLEANUP_INTERVAL_MINUTES: "STUCK_TRACKS_CLEANUP_INTERVAL_MINUTES",
  STUCK_TRACKS_TIMEOUT_MINUTES: "STUCK_TRACKS_TIMEOUT_MINUTES",
} as const;

type InternalizedNumericSettingKey =
  (typeof INTERNALIZED_NUMERIC_SETTINGS)[keyof typeof INTERNALIZED_NUMERIC_SETTINGS];

export class SettingsService implements SettingsPort {
  constructor(
    private readonly repo: SettingsRepository,
    private readonly getInternalizedNumericValue: (key: string) => number | undefined,
  ) {}

  private getInternalizedNumericSetting(key: string): number | undefined {
    if (!(key in INTERNALIZED_NUMERIC_SETTINGS)) {
      return undefined;
    }

    return this.getInternalizedNumericValue(key as InternalizedNumericSettingKey);
  }

  async getString(key: string, fallback?: string): Promise<string> {
    const value = await this.repo.get(key);
    if (value !== undefined) return value;

    if (fallback !== undefined) return fallback;

    const defaultValue = SETTINGS_METADATA[key]?.defaultValue;
    if (defaultValue !== undefined) return defaultValue;

    throw new AppError(
      500,
      "internal_server_error",
      `Setting ${key} not found and no valid default value available`,
    );
  }

  async getNumber(key: string, fallback?: number): Promise<number> {
    const internalized = this.getInternalizedNumericSetting(key);
    if (internalized !== undefined) {
      return internalized;
    }

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

    throw new AppError(
      500,
      "internal_server_error",
      `Setting ${key} not found and no valid default value available`,
    );
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

  async delete(key: string): Promise<void> {
    await this.repo.delete(key);
  }
}
