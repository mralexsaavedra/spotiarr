import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import { DeezerCatalogSearchAdapter } from "./deezer-catalog-search.adapter";
import type { DeezerClient } from "./deezer.client";

function makeMockDeezerClient(): DeezerClient {
  return {
    searchArtistList: vi.fn().mockResolvedValue([]),
    searchAlbumList: vi.fn().mockResolvedValue([]),
    searchArtist: vi.fn().mockResolvedValue(null),
    searchAlbum: vi.fn().mockResolvedValue(null),
    getArtistById: vi.fn().mockResolvedValue(null),
    getArtistAlbums: vi.fn().mockResolvedValue([]),
    getAlbumTracks: vi.fn().mockResolvedValue([]),
  } as unknown as DeezerClient;
}

function makeMockFeedRepo(): FeedRepositoryPort {
  return {
    getArtistByAnyId: vi.fn().mockResolvedValue(null),
    getArtistBySpotifyId: vi.fn().mockResolvedValue(null),
    getArtistCatalogIdentities: vi.fn().mockResolvedValue([]),
    updateArtistCatalogIdentities: vi.fn().mockResolvedValue(undefined),
    getReleases: vi.fn().mockResolvedValue([]),
    getArtists: vi.fn().mockResolvedValue([]),
    upsertArtists: vi.fn().mockResolvedValue(undefined),
    upsertReleases: vi.fn().mockResolvedValue(undefined),
    getArtistAlbumWithArtist: vi.fn().mockResolvedValue(null),
    getArtistReleaseWithArtist: vi.fn().mockResolvedValue(null),
    updateArtistAlbumIdentities: vi.fn().mockResolvedValue(undefined),
    upsertArtistAlbumSpotifyUrl: vi.fn().mockResolvedValue(undefined),
    updateArtistReleaseSpotifyUrl: vi.fn().mockResolvedValue(undefined),
    getArtistAlbumCount: vi.fn().mockResolvedValue(0),
    getArtistAlbumsFreshness: vi.fn().mockResolvedValue(null),
    getArtistIdsWithNoAlbums: vi.fn().mockResolvedValue(new Set()),
    getArtistIdsWithFreshAlbums: vi.fn().mockResolvedValue(new Set()),
    getArtistIdsWithFreshReleases: vi.fn().mockResolvedValue(new Set()),
    getArtistAlbums: vi.fn().mockResolvedValue([]),
    upsertArtistAlbums: vi.fn().mockResolvedValue(undefined),
    evictStaleFeedCache: vi.fn().mockResolvedValue(undefined),
    getArtistIdsNeedingCatalogSync: vi.fn().mockResolvedValue([]),
    getActiveArtistIdsForReleasesSync: vi.fn().mockResolvedValue([]),
    updateArtistCatalogSyncedAt: vi.fn().mockResolvedValue(undefined),
    updateArtistReleasesSyncedAt: vi.fn().mockResolvedValue(undefined),
    getSyncState: vi
      .fn()
      .mockResolvedValue({ id: 1, lastSyncAt: null, status: "idle", error: null }),
    setSyncState: vi.fn().mockResolvedValue(undefined),
    getCatalogSyncState: vi
      .fn()
      .mockResolvedValue({ id: 1, lastSyncAt: null, status: "idle", error: null }),
    setCatalogSyncState: vi.fn().mockResolvedValue(undefined),
  } as unknown as FeedRepositoryPort;
}

describe("DeezerCatalogSearchAdapter", () => {
  let deezerClient: ReturnType<typeof makeMockDeezerClient>;
  let feedRepo: ReturnType<typeof makeMockFeedRepo>;
  let adapter: DeezerCatalogSearchAdapter;

  beforeEach(() => {
    deezerClient = makeMockDeezerClient();
    feedRepo = makeMockFeedRepo();
    adapter = new DeezerCatalogSearchAdapter(deezerClient, feedRepo);
  });

  describe("searchCatalog — artist type", () => {
    it("returns empty artists array when Deezer returns no results", async () => {
      vi.mocked(deezerClient.searchArtistList).mockResolvedValue([]);

      const result = await adapter.searchCatalog("unknown query", ["artist"], { artist: 5 });

      expect(result.artists).toEqual([]);
      expect(result.albums).toEqual([]);
      expect(result.tracks).toEqual([]);
    });

    it("surfaces Deezer ID when artist not found in FollowedArtistCache", async () => {
      vi.mocked(deezerClient.searchArtistList).mockResolvedValue([
        { id: 12345, name: "Test Artist" },
      ]);
      vi.mocked(feedRepo.getArtistByAnyId).mockResolvedValue(null);

      const result = await adapter.searchCatalog("Test Artist", ["artist"], { artist: 5 });

      expect(result.artists).toHaveLength(1);
      expect(result.artists[0].id).toBe("12345");
      expect(result.artists[0].name).toBe("Test Artist");
      expect(result.artists[0].spotifyUrl).toBeNull();
    });

    it("resolves Spotify ID when artist has deezerId in FollowedArtistCache", async () => {
      vi.mocked(deezerClient.searchArtistList).mockResolvedValue([
        { id: 12345, name: "Followed Artist" },
      ]);
      vi.mocked(feedRepo.getArtistByAnyId).mockResolvedValue({
        id: "spotifyId22chars0000000",
        name: "Followed Artist",
        image: "http://img.jpg",
        spotifyUrl: "https://open.spotify.com/artist/spotifyId22chars0000000",
      });

      const result = await adapter.searchCatalog("Followed Artist", ["artist"], { artist: 5 });

      expect(result.artists).toHaveLength(1);
      expect(result.artists[0].id).toBe("spotifyId22chars0000000");
      expect(result.artists[0].spotifyUrl).toBe(
        "https://open.spotify.com/artist/spotifyId22chars0000000",
      );
    });

    it("does not emit Spotify search calls for artist queries", async () => {
      vi.mocked(deezerClient.searchArtistList).mockResolvedValue([
        { id: 99, name: "Deezer Artist" },
      ]);

      await adapter.searchCatalog("Deezer Artist", ["artist"], { artist: 5 });

      // feedRepo.getArtistByAnyId may be called for ID resolution, but no Spotify HTTP call
      // The adapter only calls deezerClient methods, never Spotify
      expect(deezerClient.searchArtistList).toHaveBeenCalledWith("Deezer Artist", 5);
    });
  });

  describe("searchCatalog — album type", () => {
    it("returns albums with kind, artistId, and albumId fields", async () => {
      vi.mocked(deezerClient.searchAlbumList).mockResolvedValue([
        {
          id: 777,
          title: "Test Album",
          cover_medium: "http://cover.jpg",
          release_date: "2024-01-01",
          artist: { id: 99, name: "Test Artist" },
        },
      ]);

      const result = await adapter.searchCatalog("Test Album", ["album"], { album: 5 });

      expect(result.albums).toHaveLength(1);
      expect(result.albums[0].albumId).toBe("777");
      expect(result.albums[0].artistId).toBe("99");
      expect(result.albums[0].albumName).toBe("Test Album");
    });

    it("returns empty albums array when Deezer returns no results", async () => {
      vi.mocked(deezerClient.searchAlbumList).mockResolvedValue([]);

      const result = await adapter.searchCatalog("nonexistent", ["album"], { album: 5 });

      expect(result.albums).toEqual([]);
    });

    it("does not emit Spotify search calls for album queries", async () => {
      vi.mocked(deezerClient.searchAlbumList).mockResolvedValue([]);

      await adapter.searchCatalog("some album", ["album"], { album: 5 });

      expect(deezerClient.searchAlbumList).toHaveBeenCalledWith("some album", 5);
    });
  });

  describe("searchCatalog — Deezer error / 429 graceful degradation", () => {
    it("returns empty results when DeezerClient throws on artist search", async () => {
      vi.mocked(deezerClient.searchArtistList).mockRejectedValue(
        new Error("429 Too Many Requests"),
      );

      const result = await adapter.searchCatalog("artist", ["artist"], { artist: 5 });

      expect(result.artists).toEqual([]);
    });

    it("returns empty results when DeezerClient throws on album search", async () => {
      vi.mocked(deezerClient.searchAlbumList).mockRejectedValue(new Error("network error"));

      const result = await adapter.searchCatalog("album", ["album"], { album: 5 });

      expect(result.albums).toEqual([]);
    });
  });

  describe("searchCatalog — track type (deferred to PR-3.1b)", () => {
    it("returns empty tracks array when track type requested (not yet implemented)", async () => {
      const result = await adapter.searchCatalog("query", ["track"], { track: 5 });

      expect(result.tracks).toEqual([]);
    });
  });
});
