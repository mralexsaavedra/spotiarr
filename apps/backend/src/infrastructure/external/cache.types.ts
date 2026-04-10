export interface CacheEntry<T> {
  value: T;
  createdAt: number;
  ttlMs: number;
}

export interface PromiseCacheEntry<T> {
  promise: Promise<T>;
  createdAt: number;
  ttlMs: number;
}

export const createCacheEntry = <T>(value: T, ttlMs: number): CacheEntry<T> => ({
  value,
  createdAt: Date.now(),
  ttlMs,
});

export const createPromiseCacheEntry = <T>(
  promise: Promise<T>,
  ttlMs: number,
): PromiseCacheEntry<T> => ({
  promise,
  createdAt: Date.now(),
  ttlMs,
});

export const isCacheEntryStale = (
  entry: Pick<CacheEntry<unknown>, "createdAt" | "ttlMs">,
  now = Date.now(),
): boolean => {
  return now - entry.createdAt >= entry.ttlMs;
};
