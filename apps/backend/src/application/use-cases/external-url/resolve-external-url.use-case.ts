import type { ExternalUrlCachePort } from "@/application/ports/external-url-cache.port";
import type { SpotifyUrlLookupPort } from "@/application/ports/spotify-url-lookup.port";

export interface ResolveExternalUrlInput {
  provider: string;
  type: "artist" | "album" | "track";
  internalId: string;
  name?: string;
  artistName?: string;
}

/**
 * Resolves an external URL (e.g. a Spotify link) for a given entity.
 *
 * Algorithm (Design D2):
 * 1. Check cache by (provider, type, internalId) — return immediately on hit.
 * 2. On miss: call SpotifyUrlLookupClient to search by name.
 * 3. If resolved: persist to cache (permanent — URLs are immutable).
 * 4. If lookup returns null (circuit open or not found): return null.
 */
export class ResolveExternalUrlUseCase {
  constructor(
    private readonly cache: ExternalUrlCachePort,
    private readonly spotifyLookup: SpotifyUrlLookupPort,
  ) {}

  async resolve(input: ResolveExternalUrlInput): Promise<string | null> {
    const { provider, type, internalId, name, artistName } = input;

    // 1. Cache hit
    const cached = await this.cache.find(provider, type, internalId);
    if (cached) return cached;

    // 2. Cache miss — resolve via Spotify
    const resolved = await this.lookup(type, name, artistName);
    if (!resolved) return null;

    // 3. Persist to cache
    await this.cache.save({ provider, type, internalId, name, artistName, externalUrl: resolved });

    return resolved;
  }

  private async lookup(
    type: "artist" | "album" | "track",
    name?: string,
    artistName?: string,
  ): Promise<string | null> {
    if (!name) return null;

    switch (type) {
      case "artist":
        return this.spotifyLookup.resolveArtistUrl(name);
      case "album":
        return this.spotifyLookup.resolveAlbumUrl(name, artistName);
      case "track":
        return this.spotifyLookup.resolveTrackUrl(name, artistName);
      default:
        return null;
    }
  }
}
