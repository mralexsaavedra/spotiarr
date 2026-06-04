import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { DeezerArtistLookupPort } from "@/application/ports/deezer-artist-lookup.port";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { ReleaseFeedPort } from "@/application/ports/release-feed.port";
import { AppError } from "@/domain/errors/app-error";
import { GetArtistDetailUseCase } from "./get-artist-detail.use-case";

function makeRelease(overrides: Partial<ArtistRelease> = {}): ArtistRelease {
  return {
    artistId: "sp-artist-1",
    artistName: "Test Artist",
    artistImageUrl: null,
    albumId: "album-1",
    albumName: "Album One",
    albumType: "album",
    releaseDate: new Date().toISOString().slice(0, 10),
    coverUrl: null,
    ...overrides,
  };
}

function mockRepo(partial: Partial<FeedRepositoryPort> = {}): FeedRepositoryPort {
  return {
    getArtistBySpotifyId: vi.fn().mockResolvedValue(null),
    getArtistByAnyId: vi.fn().mockResolvedValue(null),
    getArtistAlbumsFreshness: vi.fn().mockResolvedValue(null),
    getArtistAlbums: vi.fn().mockResolvedValue([]),
    upsertArtistAlbums: vi.fn().mockResolvedValue(undefined),
    upsertArtists: vi.fn().mockResolvedValue(undefined),
    getArtistCatalogIdentities: vi.fn().mockResolvedValue([]),
    ...partial,
  } as unknown as FeedRepositoryPort;
}

function mockDeezerArtist(): DeezerArtistLookupPort {
  return {
    searchArtist: vi.fn().mockResolvedValue(null),
    getArtistById: vi.fn().mockResolvedValue(null),
  } as unknown as DeezerArtistLookupPort;
}

function mockFeedService(): ReleaseFeedPort {
  return {
    getArtistDiscography: vi.fn().mockResolvedValue({
      albums: [],
      decision: {
        spotifyId: "sp-artist-1",
        provider: "unresolved",
        albumsFound: 0,
        newIdentityPersisted: false,
      },
    }),
  } as unknown as ReleaseFeedPort;
}

describe("GetArtistDetailUseCase", () => {
  let useCase: GetArtistDetailUseCase;
  let repo: FeedRepositoryPort;
  let feedService: ReleaseFeedPort;
  let deezerArtist: DeezerArtistLookupPort;

  beforeEach(() => {
    repo = mockRepo();
    feedService = mockFeedService();
    deezerArtist = mockDeezerArtist();
    useCase = new GetArtistDetailUseCase(repo, feedService, deezerArtist);
  });

  describe("Scenario: Fresh local cache satisfies request", () => {
    it("returns DB albums and calls no external provider", async () => {
      const freshDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      const dbAlbums = [makeRelease()];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(freshDate);
      vi.mocked(repo.getArtistAlbums).mockResolvedValue(dbAlbums);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Cached Artist",
        image: "http://image",
        spotifyUrl: "http://spotify",
      } as FollowedArtist);

      const result = await useCase.execute("sp-artist-1", 25);

      expect(feedService.getArtistDiscography).not.toHaveBeenCalled();

      expect(result.albums).toEqual(dbAlbums);
      expect(result.name).toBe("Cached Artist");
    });
  });

  describe("Scenario: Stale cache triggers refresh path", () => {
    it("fetches from Deezer when deezerId is known, persists, and skips Spotify", async () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      const deezerAlbums = [makeRelease({ albumId: "dz-1", albumName: "Deezer Album" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Test Artist",
        image: null,
        spotifyUrl: null,
      } as FollowedArtist);
      vi.mocked(feedService.getArtistDiscography).mockResolvedValue({
        albums: deezerAlbums,
        decision: {
          spotifyId: "sp-artist-1",
          provider: "deezer",
          albumsFound: 1,
          newIdentityPersisted: false,
        },
      });
      vi.mocked(repo.getArtistAlbums).mockResolvedValue(deezerAlbums);

      const result = await useCase.execute("sp-artist-1", 25);

      expect(feedService.getArtistDiscography).toHaveBeenCalledWith({
        id: "sp-artist-1",
        name: "Test Artist",
        imageUrl: null,
      });
      expect(repo.upsertArtistAlbums).toHaveBeenCalledWith(deezerAlbums);

      expect(result.albums).toEqual(deezerAlbums);
    });
  });

  describe("Scenario: Unknown artist with no cache", () => {
    it("uses Deezer for details when no DB entry exists (not Spotify)", async () => {
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(null);
      vi.mocked(deezerArtist.searchArtist).mockResolvedValue({
        id: 123456,
        name: "Deezer Artist",
        picture: "http://deezer-pic",
      });
      vi.mocked(feedService.getArtistDiscography).mockResolvedValue({
        albums: [makeRelease()],
        decision: {
          spotifyId: "sp-artist-1",
          provider: "deezer",
          albumsFound: 1,
          newIdentityPersisted: true,
        },
      });
      vi.mocked(repo.getArtistAlbums).mockResolvedValue([makeRelease()]);

      const result = await useCase.execute("sp-artist-1", 25);

      expect(deezerArtist.searchArtist).toHaveBeenCalled();
      expect(result.name).toBe("Deezer Artist");
      expect(result.spotifyUrl).toBeNull();
    });

    it("returns partial Unknown Artist when Deezer miss path hangs beyond interactive timeout", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(null);
      vi.mocked(deezerArtist.searchArtist).mockImplementation(() => new Promise(() => {}));

      const promise = useCase.execute("sp-artist-1", 25);
      await vi.advanceTimersByTimeAsync(600);
      const result = await promise;

      expect(result.name).toBe("Unknown Artist");
      expect(result.isFollowed).toBe(false);
      expect(result.albums).toEqual([]);

      vi.useRealTimers();
    });
  });

  describe("Scenario: Deezer unavailable within interactive window", () => {
    it("falls back to Spotify through ReleaseFeedService when Deezer fails", async () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const spotifyAlbums = [makeRelease({ albumId: "sp-1", albumName: "Spotify Album" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Test Artist",
        image: null,
        spotifyUrl: null,
      } as FollowedArtist);
      vi.mocked(feedService.getArtistDiscography).mockResolvedValue({
        albums: spotifyAlbums,
        decision: {
          spotifyId: "sp-artist-1",
          provider: "spotify",
          albumsFound: 1,
          newIdentityPersisted: false,
        },
      });
      vi.mocked(repo.getArtistAlbums).mockResolvedValue(spotifyAlbums);

      const result = await useCase.execute("sp-artist-1", 25);

      expect(feedService.getArtistDiscography).toHaveBeenCalled();
      expect(repo.upsertArtistAlbums).toHaveBeenCalledWith(spotifyAlbums);
      expect(result.albums).toEqual(spotifyAlbums);
    });
  });

  describe("Scenario: 429 rate limit on provider refresh", () => {
    it("returns DB albums and marks catalogRefreshPending when DB is empty", async () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Test Artist",
        image: null,
        spotifyUrl: null,
      } as FollowedArtist);
      vi.mocked(feedService.getArtistDiscography).mockRejectedValue(
        new AppError(429, "spotify_rate_limited", "Rate limited"),
      );
      vi.mocked(repo.getArtistAlbums).mockResolvedValue([]);

      const result = await useCase.execute("sp-artist-1", 25);

      expect(result.albums).toEqual([]);
      expect(result.catalogRefreshPending).toBe(true);
    });

    it("returns stale DB albums without catalogRefreshPending flag when DB has data", async () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const staleAlbums = [makeRelease({ albumId: "old-1" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Test Artist",
        image: null,
        spotifyUrl: null,
      } as FollowedArtist);
      vi.mocked(feedService.getArtistDiscography).mockRejectedValue(
        new AppError(429, "spotify_rate_limited", "Rate limited"),
      );
      vi.mocked(repo.getArtistAlbums).mockResolvedValue(staleAlbums);

      const result = await useCase.execute("sp-artist-1", 25);

      expect(result.albums).toEqual(staleAlbums);
      expect(result.catalogRefreshPending).toBeUndefined();
    });
  });

  describe("Scenario: DB miss — Deezer search hit", () => {
    it("returns artist with spotifyUrl null, persists to cache, no Spotify call", async () => {
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(null);
      vi.mocked(deezerArtist.searchArtist).mockResolvedValue({
        id: 999,
        name: "Found Artist",
        picture: "http://pic",
      });
      vi.mocked(feedService.getArtistDiscography).mockResolvedValue({
        albums: [],
        decision: {
          spotifyId: "sp-artist-1",
          provider: "deezer",
          albumsFound: 0,
          newIdentityPersisted: false,
        },
      });
      vi.mocked(repo.getArtistAlbums).mockResolvedValue([]);

      const result = await useCase.execute("sp-artist-1", 25);

      expect(deezerArtist.searchArtist).toHaveBeenCalled();
      expect(repo.upsertArtists).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ name: "Found Artist", spotifyUrl: null }),
        ]),
      );
      expect(result.spotifyUrl).toBeNull();
      expect(result.name).toBe("Found Artist");
    });
  });

  describe("Scenario: DB miss — Deezer miss (graceful degradation)", () => {
    it("returns Unknown Artist placeholder, no Spotify call, no crash", async () => {
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(null);
      vi.mocked(deezerArtist.searchArtist).mockResolvedValue(null);
      vi.mocked(feedService.getArtistDiscography).mockResolvedValue({
        albums: [],
        decision: {
          spotifyId: "sp-artist-1",
          provider: "unresolved",
          albumsFound: 0,
          newIdentityPersisted: false,
        },
      });
      vi.mocked(repo.getArtistAlbums).mockResolvedValue([]);

      const result = await useCase.execute("sp-artist-1", 25);

      expect(result.name).toBe("Unknown Artist");
      expect(result.spotifyUrl).toBeNull();
      expect(result.albums).toEqual([]);
    });
  });

  describe("Scenario: Deezer 429 during miss path", () => {
    it("returns graceful degradation response, no Spotify fallback", async () => {
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(null);
      vi.mocked(deezerArtist.searchArtist).mockRejectedValue(
        new AppError(429, "spotify_rate_limited", "Rate limited"),
      );

      const result = await useCase.execute("sp-artist-1", 25);

      expect(result.name).toBe("Unknown Artist");
      expect(result.spotifyUrl).toBeNull();
      expect(result.albums).toEqual([]);
    });
  });

  describe("Scenario: Deezer ID in miss path — getArtistById used", () => {
    it("calls getArtistById when id looks like a Deezer numeric ID", async () => {
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(null);
      vi.mocked(deezerArtist.getArtistById).mockResolvedValue({
        id: 123,
        name: "Deezer Direct Artist",
        picture: null,
      });
      vi.mocked(feedService.getArtistDiscography).mockResolvedValue({
        albums: [],
        decision: {
          spotifyId: "123",
          provider: "deezer",
          albumsFound: 0,
          newIdentityPersisted: false,
        },
      });
      vi.mocked(repo.getArtistAlbums).mockResolvedValue([]);

      // "123" is a pure numeric string — a Deezer ID
      const result = await useCase.execute("123", 25);

      expect(deezerArtist.getArtistById).toHaveBeenCalledWith("123");
      expect(deezerArtist.searchArtist).not.toHaveBeenCalled();

      expect(result.name).toBe("Deezer Direct Artist");
    });
  });

  describe("Scenario: 429 or timeout on artist details resolution", () => {
    it("returns partial response when Deezer details return 429 and no DB entry", async () => {
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue(null);
      vi.mocked(deezerArtist.searchArtist).mockRejectedValue(
        new AppError(429, "spotify_rate_limited", "Rate limited"),
      );

      const result = await useCase.execute("sp-artist-1", 25);

      expect(result.name).toBe("Unknown Artist");
      expect(result.isFollowed).toBe(false);
      expect(result.albums).toEqual([]);
    });
  });

  describe("Scenario: 504 interactive timeout on provider refresh", () => {
    it("sets catalogRefreshPending when DB is empty after timeout", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Test Artist",
        image: null,
        spotifyUrl: null,
      } as FollowedArtist);
      vi.mocked(feedService.getArtistDiscography).mockImplementation(() => new Promise(() => {}));
      vi.mocked(repo.getArtistAlbums).mockResolvedValue([]);

      const promise = useCase.execute("sp-artist-1", 25);
      await vi.advanceTimersByTimeAsync(600);
      const result = await promise;

      expect(result.albums).toEqual([]);
      expect(result.catalogRefreshPending).toBe(true);

      vi.useRealTimers();
    });

    it("does not set catalogRefreshPending when DB has stale albums after timeout", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const dbAlbums = [makeRelease({ albumId: "db-1" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Test Artist",
        image: null,
        spotifyUrl: null,
      } as FollowedArtist);
      vi.mocked(feedService.getArtistDiscography).mockImplementation(() => new Promise(() => {}));
      vi.mocked(repo.getArtistAlbums).mockResolvedValue(dbAlbums);

      const promise = useCase.execute("sp-artist-1", 25);
      await vi.advanceTimersByTimeAsync(600);
      const result = await promise;

      expect(result.albums).toEqual(dbAlbums);
      expect(result.catalogRefreshPending).toBeUndefined();

      vi.useRealTimers();
    });
  });

  describe("Scenario: Provider chain times out", () => {
    it("falls back to cached DB albums when discography never resolves", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const dbAlbums = [makeRelease({ albumId: "db-1" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistByAnyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Test Artist",
        image: null,
        spotifyUrl: null,
      } as FollowedArtist);
      vi.mocked(feedService.getArtistDiscography).mockImplementation(() => new Promise(() => {}));
      vi.mocked(repo.getArtistAlbums).mockResolvedValue(dbAlbums);

      const promise = useCase.execute("sp-artist-1", 25);
      await vi.advanceTimersByTimeAsync(600);
      const result = await promise;

      expect(result.albums).toEqual(dbAlbums);
      expect(result.catalogRefreshPending).toBeUndefined();

      vi.useRealTimers();
    });
  });
});
