import { APP_CONFIG } from "@/config/app";

const MS_PER_MINUTE = 60 * 1000;
const DEFAULT_STALE_RATIO = 0.5;

export interface QueryCacheTimings {
  staleTime: number;
  gcTime: number;
}

export const getCacheMinutesFromSettings = (
  settings: Array<{ key: string; value: string }>,
  key = APP_CONFIG.CACHE.RELEASES_CACHE_KEY,
  fallback = APP_CONFIG.CACHE.DEFAULT_MINUTES,
): number => {
  const setting = settings.find((s) => s.key === key);

  if (!setting) {
    return fallback;
  }

  const parsed = parseInt(setting.value, 10);

  return Number.isNaN(parsed) ? fallback : parsed;
};

export const buildStaleWhileRevalidateTimings = (cacheMinutes: number): QueryCacheTimings => {
  const gcTime = cacheMinutes * MS_PER_MINUTE;
  const staleTime = Math.max(Math.floor(gcTime * DEFAULT_STALE_RATIO), MS_PER_MINUTE);

  return {
    staleTime,
    gcTime,
  };
};

export const STALE_TIME_LONG = 5 * 60 * 1000;
export const STALE_TIME_MEDIUM = 60 * 1000;
export const STALE_TIME_AUTH = 30 * 1000;

export const getSettingsCacheTimings = (
  settings: Array<{ key: string; value: string }>,
  key = APP_CONFIG.CACHE.RELEASES_CACHE_KEY,
  fallback = APP_CONFIG.CACHE.DEFAULT_MINUTES,
): QueryCacheTimings => {
  const cacheMinutes = getCacheMinutesFromSettings(settings, key, fallback);
  return buildStaleWhileRevalidateTimings(cacheMinutes);
};
