export const PLAYLIST_CACHE_TTL_MS = 86_400_000;

export interface PlaylistCachePort {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
  invalidate(key: string): Promise<void>;
}
