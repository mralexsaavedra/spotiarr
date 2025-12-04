import { APP_CONFIG } from "../config/app";

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
