import { SETTINGS_METADATA } from "@/constants/settings-metadata";
import { AppError } from "@/domain/errors/app-error";
import type { SettingsRepository } from "@/domain/repositories/settings.repository";
import { getEnv } from "@/infrastructure/setup/environment";

const INTERNALIZED_NUMERIC_SETTINGS = {
  FEED_SYNC_INTERVAL_MINUTES: "FEED_SYNC_INTERVAL_MINUTES",
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

export class SettingsService {
  constructor(private readonly repo: SettingsRepository) {}

  private getInternalizedNumericSetting(key: string): number | undefined {
    const env = getEnv();

    switch (key as InternalizedNumericSettingKey) {
      case INTERNALIZED_NUMERIC_SETTINGS.FEED_SYNC_INTERVAL_MINUTES:
        return env.FEED_SYNC_INTERVAL_MINUTES;
      case INTERNALIZED_NUMERIC_SETTINGS.FOLLOWED_ARTISTS_MAX:
        return env.FOLLOWED_ARTISTS_MAX;
      case INTERNALIZED_NUMERIC_SETTINGS.RELEASES_LOOKBACK_DAYS:
        return env.RELEASES_LOOKBACK_DAYS;
      case INTERNALIZED_NUMERIC_SETTINGS.RELEASES_CACHE_MINUTES:
        return env.RELEASES_CACHE_MINUTES;
      case INTERNALIZED_NUMERIC_SETTINGS.YT_SEARCH_CONCURRENCY:
        return env.YT_SEARCH_CONCURRENCY;
      case INTERNALIZED_NUMERIC_SETTINGS.YT_SEARCH_DELAY_MS:
        return env.YT_SEARCH_DELAY_MS;
      case INTERNALIZED_NUMERIC_SETTINGS.YT_DOWNLOADS_PER_MINUTE:
        return env.YT_DOWNLOADS_PER_MINUTE;
      case INTERNALIZED_NUMERIC_SETTINGS.STUCK_TRACKS_CLEANUP_INTERVAL_MINUTES:
        return env.STUCK_TRACKS_CLEANUP_INTERVAL_MINUTES;
      case INTERNALIZED_NUMERIC_SETTINGS.STUCK_TRACKS_TIMEOUT_MINUTES:
        return env.STUCK_TRACKS_TIMEOUT_MINUTES;
      default:
        return undefined;
    }
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
