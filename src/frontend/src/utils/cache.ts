export const getCacheMinutesFromSettings = (
  settings: Array<{ key: string; value: string }>,
  key = "RELEASES_CACHE_MINUTES",
  fallback = 5,
): number => {
  const setting = settings.find((s) => s.key === key);

  if (!setting) {
    return fallback;
  }

  const parsed = parseInt(setting.value, 10);

  return Number.isNaN(parsed) ? fallback : parsed;
};
