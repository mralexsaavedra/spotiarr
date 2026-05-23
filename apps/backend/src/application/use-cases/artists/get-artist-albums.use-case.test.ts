import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { ReleaseFeedPort } from "@/application/ports/release-feed.port";
import { GetArtistAlbumsUseCase } from "./get-artist-albums.use-case";

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
    getArtistAlbumsFreshness: vi.fn().mockResolvedValue(null),
    getArtistAlbums: vi.fn().mockResolvedValue([]),
    getArtistBySpotifyId: vi.fn().mockResolvedValue(null),
    upsertArtistAlbums: vi.fn().mockResolvedValue(undefined),
    ...partial,
  } as unknown as FeedRepositoryPort;
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

describe("GetArtistAlbumsUseCase", () => {
  let useCase: GetArtistAlbumsUseCase;
  let repo: FeedRepositoryPort;
  let feedService: ReleaseFeedPort;

  beforeEach(() => {
    repo = mockRepo();
    feedService = mockFeedService();
    useCase = new GetArtistAlbumsUseCase(repo, feedService);
  });

  describe("Scenario: Fresh cache serves paginated request", () => {
    it("returns paginated DB albums without calling providers", async () => {
      const freshDate = new Date(Date.now() - 1 * 60 * 60 * 1000);
      const dbAlbums = [makeRelease({ albumId: "page-1" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(freshDate);
      vi.mocked(repo.getArtistAlbums).mockResolvedValue(dbAlbums);

      const result = await useCase.execute("sp-artist-1", 25, 0);

      expect(feedService.getArtistDiscography).not.toHaveBeenCalled();
      expect(repo.getArtistAlbums).toHaveBeenCalledWith("sp-artist-1", 25, 0);
      expect(result).toEqual(dbAlbums);
    });
  });

  describe("Scenario: Stale cache triggers refresh before pagination", () => {
    it("refreshes from providers then returns paginated results", async () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const providerAlbums = [makeRelease({ albumId: "dz-1" }), makeRelease({ albumId: "dz-2" })];
      const dbAlbums = [makeRelease({ albumId: "dz-1" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Test Artist",
        image: null,
        spotifyUrl: null,
      } as FollowedArtist);
      vi.mocked(feedService.getArtistDiscography).mockResolvedValue({
        albums: providerAlbums,
        decision: {
          spotifyId: "sp-artist-1",
          provider: "deezer",
          albumsFound: 2,
          newIdentityPersisted: false,
        },
      });
      vi.mocked(repo.getArtistAlbums).mockResolvedValue(dbAlbums);

      const result = await useCase.execute("sp-artist-1", 1, 0);

      expect(feedService.getArtistDiscography).toHaveBeenCalledWith({
        id: "sp-artist-1",
        name: "Test Artist",
        imageUrl: null,
      });
      expect(repo.upsertArtistAlbums).toHaveBeenCalledWith(providerAlbums);
      expect(repo.getArtistAlbums).toHaveBeenCalledWith("sp-artist-1", 1, 0);
      expect(result).toEqual(dbAlbums);
    });
  });

  describe("Scenario: Provider failure falls back to DB", () => {
    it("returns DB albums even when provider refresh fails", async () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const dbAlbums = [makeRelease({ albumId: "old-1" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Test Artist",
        image: null,
        spotifyUrl: null,
      } as FollowedArtist);
      vi.mocked(feedService.getArtistDiscography).mockRejectedValue(new Error("Deezer down"));
      vi.mocked(repo.getArtistAlbums).mockResolvedValue(dbAlbums);

      const result = await useCase.execute("sp-artist-1", 25, 0);

      expect(result).toEqual(dbAlbums);
    });
  });

  describe("Scenario: Unknown artist with no cached albums", () => {
    it("attempts provider refresh and returns empty when unresolved", async () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue(null);
      vi.mocked(feedService.getArtistDiscography).mockResolvedValue({
        albums: [],
        decision: {
          spotifyId: "sp-artist-1",
          provider: "unresolved",
          albumsFound: 0,
          newIdentityPersisted: false,
        },
      });

      const result = await useCase.execute("sp-artist-1", 25, 0);

      expect(feedService.getArtistDiscography).toHaveBeenCalledWith({
        id: "sp-artist-1",
        name: "Unknown Artist",
        imageUrl: null,
      });
      expect(result).toEqual([]);
    });
  });

  describe("Scenario: Provider chain times out", () => {
    it("falls back to cached DB albums when discography never resolves", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const dbAlbums = [makeRelease({ albumId: "db-1" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Test Artist",
        image: null,
        spotifyUrl: null,
      } as FollowedArtist);
      vi.mocked(feedService.getArtistDiscography).mockImplementation(() => new Promise(() => {}));
      vi.mocked(repo.getArtistAlbums).mockResolvedValue(dbAlbums);

      const promise = useCase.execute("sp-artist-1", 25, 0);
      await vi.advanceTimersByTimeAsync(600);
      const result = await promise;

      expect(result).toEqual(dbAlbums);

      vi.useRealTimers();
    });
  });
});
