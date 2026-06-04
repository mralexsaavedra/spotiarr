import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ExternalUrlCachePort } from "@/application/ports/external-url-cache.port";
import type { SpotifyUrlLookupPort } from "@/application/ports/spotify-url-lookup.port";
import { ResolveExternalUrlUseCase } from "./resolve-external-url.use-case";

function makeMockCache(): ExternalUrlCachePort {
  return {
    find: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
  };
}

function makeMockSpotifyLookup(): SpotifyUrlLookupPort {
  return {
    resolveArtistUrl: vi.fn().mockResolvedValue(null),
    resolveAlbumUrl: vi.fn().mockResolvedValue(null),
    resolveTrackUrl: vi.fn().mockResolvedValue(null),
  };
}

describe("ResolveExternalUrlUseCase", () => {
  let cache: ExternalUrlCachePort;
  let spotifyLookup: SpotifyUrlLookupPort;
  let useCase: ResolveExternalUrlUseCase;

  beforeEach(() => {
    cache = makeMockCache();
    spotifyLookup = makeMockSpotifyLookup();
    useCase = new ResolveExternalUrlUseCase(cache, spotifyLookup);
  });

  describe("Cache hit — returns URL without Spotify call", () => {
    it("returns cached URL when found", async () => {
      vi.mocked(cache.find).mockResolvedValue("https://open.spotify.com/artist/abc123");

      const result = await useCase.resolve({
        provider: "spotify",
        type: "artist",
        internalId: "12345",
      });

      expect(result).toBe("https://open.spotify.com/artist/abc123");
      expect(spotifyLookup.resolveArtistUrl).not.toHaveBeenCalled();
      expect(cache.save).not.toHaveBeenCalled();
    });
  });

  describe("Cache miss — resolves via SpotifyUrlLookupClient and persists", () => {
    it("resolves artist URL via Spotify, persists to cache, and returns URL", async () => {
      vi.mocked(cache.find).mockResolvedValue(null);
      vi.mocked(spotifyLookup.resolveArtistUrl).mockResolvedValue(
        "https://open.spotify.com/artist/resolved",
      );

      const result = await useCase.resolve({
        provider: "spotify",
        type: "artist",
        internalId: "99999",
        name: "Test Artist",
      });

      expect(result).toBe("https://open.spotify.com/artist/resolved");
      expect(spotifyLookup.resolveArtistUrl).toHaveBeenCalledWith("Test Artist");
      expect(cache.save).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: "spotify",
          type: "artist",
          internalId: "99999",
          externalUrl: "https://open.spotify.com/artist/resolved",
        }),
      );
    });

    it("resolves album URL via Spotify using name and artistName", async () => {
      vi.mocked(cache.find).mockResolvedValue(null);
      vi.mocked(spotifyLookup.resolveAlbumUrl).mockResolvedValue(
        "https://open.spotify.com/album/xyz",
      );

      const result = await useCase.resolve({
        provider: "spotify",
        type: "album",
        internalId: "44444",
        name: "My Album",
        artistName: "My Artist",
      });

      expect(result).toBe("https://open.spotify.com/album/xyz");
      expect(spotifyLookup.resolveAlbumUrl).toHaveBeenCalledWith("My Album", "My Artist");
    });

    it("resolves track URL via Spotify", async () => {
      vi.mocked(cache.find).mockResolvedValue(null);
      vi.mocked(spotifyLookup.resolveTrackUrl).mockResolvedValue(
        "https://open.spotify.com/track/t1",
      );

      const result = await useCase.resolve({
        provider: "spotify",
        type: "track",
        internalId: "55555",
        name: "My Track",
        artistName: "My Artist",
      });

      expect(result).toBe("https://open.spotify.com/track/t1");
      expect(spotifyLookup.resolveTrackUrl).toHaveBeenCalledWith("My Track", "My Artist");
    });

    it("returns null when Spotify lookup returns null (circuit open or not found)", async () => {
      vi.mocked(cache.find).mockResolvedValue(null);
      vi.mocked(spotifyLookup.resolveArtistUrl).mockResolvedValue(null);

      const result = await useCase.resolve({
        provider: "spotify",
        type: "artist",
        internalId: "11111",
        name: "Unknown",
      });

      expect(result).toBeNull();
      expect(cache.save).not.toHaveBeenCalled();
    });
  });
});
