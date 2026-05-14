import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import type { ReleaseFeedService } from "@/infrastructure/external/release-feed.service";
import type { SpotifyArtistClient } from "@/infrastructure/external/spotify-artist.client";
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

function mockRepo(partial: Partial<FeedRepository> = {}): FeedRepository {
  return {
    getArtistBySpotifyId: vi.fn().mockResolvedValue(null),
    getArtistAlbumsFreshness: vi.fn().mockResolvedValue(null),
    getArtistAlbums: vi.fn().mockResolvedValue([]),
    upsertArtistAlbums: vi.fn().mockResolvedValue(undefined),
    ...partial,
  } as unknown as FeedRepository;
}

function mockFeedService(): ReleaseFeedService {
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
  } as unknown as ReleaseFeedService;
}

function mockSpotifyArtist(): SpotifyArtistClient {
  return {
    getArtistDetails: vi.fn().mockResolvedValue({
      name: "Spotify Artist",
      image: null,
      spotifyUrl: null,
      followers: null,
      genres: [],
    }),
  } as unknown as SpotifyArtistClient;
}

describe("GetArtistDetailUseCase", () => {
  let useCase: GetArtistDetailUseCase;
  let repo: FeedRepository;
  let feedService: ReleaseFeedService;
  let spotifyArtist: SpotifyArtistClient;

  beforeEach(() => {
    repo = mockRepo();
    feedService = mockFeedService();
    spotifyArtist = mockSpotifyArtist();
    useCase = new GetArtistDetailUseCase(repo, feedService, spotifyArtist);
  });

  describe("Scenario: Fresh local cache satisfies request", () => {
    it("returns DB albums and calls no external provider", async () => {
      const freshDate = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
      const dbAlbums = [makeRelease()];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(freshDate);
      vi.mocked(repo.getArtistAlbums).mockResolvedValue(dbAlbums);
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue({
        id: "sp-artist-1",
        name: "Cached Artist",
        image: "http://image",
        spotifyUrl: "http://spotify",
      } as FollowedArtist);

      const result = await useCase.execute("sp-artist-1", 25);

      expect(feedService.getArtistDiscography).not.toHaveBeenCalled();
      expect(spotifyArtist.getArtistDetails).not.toHaveBeenCalled();
      expect(result.albums).toEqual(dbAlbums);
      expect(result.name).toBe("Cached Artist");
    });
  });

  describe("Scenario: Stale cache triggers refresh path", () => {
    it("fetches from Deezer when deezerId is known, persists, and skips Spotify", async () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000); // 48 hours ago
      const deezerAlbums = [makeRelease({ albumId: "dz-1", albumName: "Deezer Album" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue({
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

      expect(feedService.getArtistDiscography).toHaveBeenCalledWith(
        {
          id: "sp-artist-1",
          name: "Test Artist",
          imageUrl: null,
        },
        500,
      );
      expect(repo.upsertArtistAlbums).toHaveBeenCalledWith(deezerAlbums);
      expect(spotifyArtist.getArtistDetails).not.toHaveBeenCalled();
      expect(result.albums).toEqual(deezerAlbums);
    });
  });

  describe("Scenario: Unknown artist with no cache", () => {
    it("falls back to Spotify for details when no DB entry exists", async () => {
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(null);
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

      expect(spotifyArtist.getArtistDetails).toHaveBeenCalledWith("sp-artist-1");
      expect(feedService.getArtistDiscography).toHaveBeenCalledWith(
        {
          id: "sp-artist-1",
          name: "Spotify Artist",
          imageUrl: null,
        },
        500,
      );
      expect(result.name).toBe("Spotify Artist");
    });

    it("uses Spotify fallback albums and does not wait unbounded on Deezer/MusicBrainz", async () => {
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue(null);
      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(null);
      const spotifyAlbums = [
        makeRelease({ albumId: "sp-fb-1", albumName: "Spotify Fallback Album" }),
      ];
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

      expect(feedService.getArtistDiscography).toHaveBeenCalledWith(
        {
          id: "sp-artist-1",
          name: "Spotify Artist",
          imageUrl: null,
        },
        500,
      );
      expect(result.albums).toEqual(spotifyAlbums);
      expect(result.isFollowed).toBe(false);
    });
  });

  describe("Scenario: Deezer unavailable within interactive window", () => {
    it("falls back to Spotify through ReleaseFeedService when Deezer fails", async () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const spotifyAlbums = [makeRelease({ albumId: "sp-1", albumName: "Spotify Album" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue({
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
    it("returns DB albums and marks rateLimited when DB is empty", async () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue({
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
      expect(result.albumsRateLimited).toBe(true);
    });

    it("returns stale DB albums without rateLimited flag when DB has data", async () => {
      const staleDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const staleAlbums = [makeRelease({ albumId: "old-1" })];

      vi.mocked(repo.getArtistAlbumsFreshness).mockResolvedValue(staleDate);
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue({
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
      expect(result.albumsRateLimited).toBeUndefined();
    });
  });

  describe("Scenario: 429 on artist details resolution", () => {
    it("returns partial response when Spotify details return 429 and no DB entry", async () => {
      vi.mocked(repo.getArtistBySpotifyId).mockResolvedValue(null);
      vi.mocked(spotifyArtist.getArtistDetails).mockRejectedValue(
        new AppError(429, "spotify_rate_limited", "Rate limited"),
      );

      const result = await useCase.execute("sp-artist-1", 25);

      expect(result.name).toBe("Unknown Artist");
      expect(result.isFollowed).toBe(false);
      expect(result.albums).toEqual([]);
    });
  });
});
