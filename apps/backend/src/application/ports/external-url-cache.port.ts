export interface ExternalUrlCacheEntry {
  provider: string;
  type: string;
  internalId: string;
  name?: string;
  artistName?: string;
  externalUrl: string;
}

export interface ExternalUrlCachePort {
  /** Look up a cached external URL by (provider, type, internalId). Returns null if not found. */
  find(provider: string, type: string, internalId: string): Promise<string | null>;
  /** Persist a resolved external URL entry. URLs are permanent — no TTL. */
  save(entry: ExternalUrlCacheEntry): Promise<void>;
}
