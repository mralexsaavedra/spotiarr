import type { SettingsPort } from "@/application/ports/settings.port";
import type { SpotifyUrlLookupPort } from "@/application/ports/spotify-url-lookup.port";
import { CircuitBreaker } from "../../circuit-breaker";
import { RateLimiter } from "../../rate-limiter";
import { SpotifyAuthService } from "../../spotify-auth.service";
import { SpotifyBaseClient } from "../../spotify-base.client";

/**
 * Minimal Spotify client that resolves external URLs for artists, albums, and tracks
 * via the Spotify /v1/search API. Used by ResolveExternalUrlUseCase.
 *
 * Deliberately standalone — does NOT extend or reuse SpotifySearchClient
 * so PR-3.4 can delete the broader search client cleanly.
 *
 * All Spotify calls are routed through the existing CircuitBreaker via SpotifyBaseClient.
 */
export class SpotifyUrlLookupClient extends SpotifyBaseClient implements SpotifyUrlLookupPort {
  constructor(
    authService: SpotifyAuthService,
    settingsService: SettingsPort,
    appTokenCircuitBreaker: CircuitBreaker,
    appTokenRateLimiter: RateLimiter,
  ) {
    super(
      authService,
      settingsService,
      "SpotifyUrlLookupClient",
      appTokenCircuitBreaker,
      appTokenRateLimiter,
      "interactive",
    );
  }

  /**
   * Resolve the Spotify URL for an artist by name.
   * Returns null if not found or circuit is open.
   */
  async resolveArtistUrl(name: string): Promise<string | null> {
    return this.search(name, "artist");
  }

  /**
   * Resolve the Spotify URL for an album by name and optional artist.
   * Returns null if not found or circuit is open.
   */
  async resolveAlbumUrl(name: string, artistName?: string): Promise<string | null> {
    const query = artistName ? `${name} ${artistName}` : name;
    return this.search(query, "album");
  }

  /**
   * Resolve the Spotify URL for a track by name and optional artist.
   * Returns null if not found or circuit is open.
   */
  async resolveTrackUrl(name: string, artistName?: string): Promise<string | null> {
    const query = artistName ? `${name} ${artistName}` : name;
    return this.search(query, "track");
  }

  private async search(query: string, type: "artist" | "album" | "track"): Promise<string | null> {
    try {
      const encoded = encodeURIComponent(query);
      const url = `https://api.spotify.com/v1/search?q=${encoded}&type=${type}&limit=1`;
      const response = await this.fetchWithAppToken(url);

      if (!response.ok) {
        this.log(`Search failed: ${response.status} for type=${type} query="${query}"`, "warn");
        return null;
      }

      const data = (await response.json()) as {
        artists?: { items: { external_urls?: { spotify?: string } }[] };
        albums?: { items: { external_urls?: { spotify?: string } }[] };
        tracks?: { items: { external_urls?: { spotify?: string } }[] };
      };

      const items = data[`${type}s` as "artists" | "albums" | "tracks"]?.items ?? [];

      if (items.length === 0) return null;

      return items[0].external_urls?.spotify ?? null;
    } catch (err) {
      this.log(`resolveUrl error for ${type}: ${err}`, "warn");
      return null;
    }
  }
}
