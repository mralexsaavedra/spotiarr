import type { NormalizedTrack } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AlbumTracksCachePort } from "@/application/ports/album-tracks-cache.port";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import type { DeezerClient } from "@/infrastructure/external/providers/deezer/deezer.client";
import type { MusicBrainzClient } from "@/infrastructure/external/providers/musicbrainz/musicbrainz.client";
import type { SpotifyAlbumClient } from "@/infrastructure/external/spotify-album.client";
import { GetAlbumTracksUseCase } from "./get-album-tracks.use-case";

function makeNormalizedTrack(overrides: Partial<NormalizedTrack> = {}): NormalizedTrack {
  return {
    name: "Test Track",
    artist: "Test Artist",
    album: "Test Album",
    trackNumber: 1,
    discNumber: 1,
    durationMs: 180000,
    artists: [{ name: "Test Artist", url: undefined }],
    ...overrides,
  };
}

function mockRepo(partial: Partial<FeedRepository> = {}): FeedRepository {
  return {
    getArtistAlbumWithArtist: vi.fn().mockResolvedValue(null),
    updateArtistAlbumIdentities: vi.fn().mockResolvedValue(undefined),
    ...partial,
  } as unknown as FeedRepository;
}

function mockDeezerClient(partial: Partial<DeezerClient> = {}): DeezerClient {
  return {
    searchAlbum: vi.fn().mockResolvedValue(null),
    getAlbumTracks: vi.fn().mockResolvedValue([]),
    ...partial,
  } as unknown as DeezerClient;
}

function mockMusicBrainzClient(partial: Partial<MusicBrainzClient> = {}): MusicBrainzClient {
  return {
    getReleaseTracks: vi.fn().mockResolvedValue([]),
    ...partial,
  } as unknown as MusicBrainzClient;
}

function mockSpotifyAlbumClient(partial: Partial<SpotifyAlbumClient> = {}): SpotifyAlbumClient {
  return {
    getAlbumTracks: vi.fn().mockResolvedValue([]),
    ...partial,
  } as unknown as SpotifyAlbumClient;
}

function mockAlbumTracksCache(partial: Partial<AlbumTracksCachePort> = {}): AlbumTracksCachePort {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    ...partial,
  } as unknown as AlbumTracksCachePort;
}

describe("GetAlbumTracksUseCase", () => {
  let useCase: GetAlbumTracksUseCase;
  let repo: FeedRepository;
  let deezerClient: DeezerClient;
  let musicBrainzClient: MusicBrainzClient;
  let spotifyAlbumClient: SpotifyAlbumClient;

  beforeEach(() => {
    repo = mockRepo();
    deezerClient = mockDeezerClient();
    musicBrainzClient = mockMusicBrainzClient();
    spotifyAlbumClient = mockSpotifyAlbumClient();
    useCase = new GetAlbumTracksUseCase(repo, deezerClient, musicBrainzClient, spotifyAlbumClient);
  });

  describe("Scenario: Deezer resolves tracks successfully with persisted ID", () => {
    it("fetches tracks directly from Deezer and skips other providers", async () => {
      const deezerTracks = [makeNormalizedTrack()];

      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
        id: "artist:album",
        spotifyArtistId: "sp-artist-1",
        albumId: "album-1",
        albumName: "Album One",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        deezerAlbumId: "dz-123",
        mbAlbumId: null,
        artistName: "Test Artist",
      });
      vi.mocked(deezerClient.getAlbumTracks).mockResolvedValue(deezerTracks);

      const result = await useCase.execute("sp-artist-1", "album-1");

      expect(result).toEqual(deezerTracks);
      expect(deezerClient.getAlbumTracks).toHaveBeenCalledWith("dz-123");
      expect(deezerClient.searchAlbum).not.toHaveBeenCalled();
      expect(musicBrainzClient.getReleaseTracks).not.toHaveBeenCalled();
      expect(spotifyAlbumClient.getAlbumTracks).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Deezer search resolves and persists identity", () => {
    it("searches Deezer by name, persists identity, and returns tracks", async () => {
      const deezerTracks = [makeNormalizedTrack()];

      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
        id: "sp-artist-1:album-1",
        spotifyArtistId: "sp-artist-1",
        albumId: "album-1",
        albumName: "Album One",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        deezerAlbumId: null,
        mbAlbumId: null,
        artistName: "Test Artist",
      });
      vi.mocked(deezerClient.searchAlbum).mockResolvedValue({
        id: 456,
        title: "Album One",
        cover: "http://cover.jpg",
      });
      vi.mocked(deezerClient.getAlbumTracks).mockResolvedValue(deezerTracks);

      const result = await useCase.execute("sp-artist-1", "album-1");

      expect(result).toEqual(deezerTracks);
      expect(deezerClient.searchAlbum).toHaveBeenCalledWith("Test Artist", "Album One");
      expect(repo.updateArtistAlbumIdentities).toHaveBeenCalledWith("sp-artist-1:album-1", {
        deezerAlbumId: "456",
      });
      expect(musicBrainzClient.getReleaseTracks).not.toHaveBeenCalled();
      expect(spotifyAlbumClient.getAlbumTracks).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Deezer miss triggers MusicBrainz fallback", () => {
    it("falls back to MusicBrainz when Deezer returns no results", async () => {
      const mbTracks = [makeNormalizedTrack({ name: "MB Track" })];

      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
        id: "sp-artist-1:album-1",
        spotifyArtistId: "sp-artist-1",
        albumId: "album-1",
        albumName: "Album One",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        deezerAlbumId: null,
        mbAlbumId: "mb-rg-1",
        artistName: "Test Artist",
      });
      vi.mocked(deezerClient.searchAlbum).mockResolvedValue(null);
      vi.mocked(musicBrainzClient.getReleaseTracks).mockResolvedValue(mbTracks);

      const result = await useCase.execute("sp-artist-1", "album-1");

      expect(result).toEqual(mbTracks);
      expect(musicBrainzClient.getReleaseTracks).toHaveBeenCalledWith("mb-rg-1");
      expect(spotifyAlbumClient.getAlbumTracks).not.toHaveBeenCalled();
    });

    it("falls back to MusicBrainz when Deezer search finds album but no tracks", async () => {
      const mbTracks = [makeNormalizedTrack({ name: "MB Track" })];

      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
        id: "sp-artist-1:album-1",
        spotifyArtistId: "sp-artist-1",
        albumId: "album-1",
        albumName: "Album One",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        deezerAlbumId: null,
        mbAlbumId: "mb-rg-1",
        artistName: "Test Artist",
      });
      vi.mocked(deezerClient.searchAlbum).mockResolvedValue({
        id: 456,
        title: "Album One",
      });
      vi.mocked(deezerClient.getAlbumTracks).mockResolvedValue([]);
      vi.mocked(musicBrainzClient.getReleaseTracks).mockResolvedValue(mbTracks);

      const result = await useCase.execute("sp-artist-1", "album-1");

      expect(result).toEqual(mbTracks);
      expect(deezerClient.searchAlbum).toHaveBeenCalled();
      expect(deezerClient.getAlbumTracks).toHaveBeenCalledWith(456);
      expect(musicBrainzClient.getReleaseTracks).toHaveBeenCalledWith("mb-rg-1");
    });
  });

  describe("Scenario: MusicBrainz miss triggers Spotify terminal fallback", () => {
    it("falls back to Spotify only for Spotify-shaped album IDs", async () => {
      const spotifyTracks = [makeNormalizedTrack({ name: "Spotify Track" })];
      const spotifyAlbumId = "0x1234567890ABCDEF1234";

      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
        id: `sp-artist-1:${spotifyAlbumId}`,
        spotifyArtistId: "sp-artist-1",
        albumId: spotifyAlbumId,
        albumName: "Album One",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        deezerAlbumId: null,
        mbAlbumId: null,
        artistName: "Test Artist",
      });
      vi.mocked(deezerClient.searchAlbum).mockResolvedValue(null);
      vi.mocked(musicBrainzClient.getReleaseTracks).mockResolvedValue([]);
      vi.mocked(spotifyAlbumClient.getAlbumTracks).mockResolvedValue(spotifyTracks);

      const result = await useCase.execute("sp-artist-1", spotifyAlbumId);

      expect(result).toEqual(spotifyTracks);
      expect(spotifyAlbumClient.getAlbumTracks).toHaveBeenCalledWith(spotifyAlbumId);
    });

    it("skips Spotify fallback for non-Spotify IDs", async () => {
      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
        id: "sp-artist-1:123456789",
        spotifyArtistId: "sp-artist-1",
        albumId: "123456789",
        albumName: "Album One",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        deezerAlbumId: null,
        mbAlbumId: null,
        artistName: "Test Artist",
      });
      vi.mocked(deezerClient.searchAlbum).mockResolvedValue(null);
      vi.mocked(musicBrainzClient.getReleaseTracks).mockResolvedValue([]);

      const result = await useCase.execute("sp-artist-1", "123456789");

      expect(result).toEqual([]);
      expect(spotifyAlbumClient.getAlbumTracks).not.toHaveBeenCalled();
    });

    it("attempts MusicBrainz for MB UUID album IDs and persists identity", async () => {
      const mbTracks = [makeNormalizedTrack({ name: "MB Track" })];
      const mbUuid = "550e8400-e29b-41d4-a716-446655440000";

      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
        id: "sp-artist-1:mb-id",
        spotifyArtistId: "sp-artist-1",
        albumId: mbUuid,
        albumName: "Album One",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        deezerAlbumId: null,
        mbAlbumId: null,
        artistName: "Test Artist",
      });
      vi.mocked(deezerClient.searchAlbum).mockResolvedValue(null);
      vi.mocked(musicBrainzClient.getReleaseTracks).mockResolvedValue(mbTracks);

      const result = await useCase.execute("sp-artist-1", mbUuid);

      expect(result).toEqual(mbTracks);
      expect(musicBrainzClient.getReleaseTracks).toHaveBeenCalledWith(mbUuid);
      expect(repo.updateArtistAlbumIdentities).toHaveBeenCalledWith("sp-artist-1:mb-id", {
        mbAlbumId: mbUuid,
      });
      expect(spotifyAlbumClient.getAlbumTracks).not.toHaveBeenCalled();
    });

    it("skips Spotify fallback for MB UUID IDs when MusicBrainz also fails", async () => {
      const mbUuid = "550e8400-e29b-41d4-a716-446655440000";

      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
        id: "sp-artist-1:mb-id",
        spotifyArtistId: "sp-artist-1",
        albumId: mbUuid,
        albumName: "Album One",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        deezerAlbumId: null,
        mbAlbumId: null,
        artistName: "Test Artist",
      });
      vi.mocked(deezerClient.searchAlbum).mockResolvedValue(null);
      vi.mocked(musicBrainzClient.getReleaseTracks).mockResolvedValue([]);

      const result = await useCase.execute("sp-artist-1", mbUuid);

      expect(result).toEqual([]);
      expect(musicBrainzClient.getReleaseTracks).toHaveBeenCalledWith(mbUuid);
      expect(spotifyAlbumClient.getAlbumTracks).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: No cache entry exists", () => {
    it("searches Deezer by name even without cache and persists if found", async () => {
      const deezerTracks = [makeNormalizedTrack()];

      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue(null);
      vi.mocked(deezerClient.searchAlbum).mockResolvedValue({
        id: 789,
        title: "Unknown Album",
      });
      vi.mocked(deezerClient.getAlbumTracks).mockResolvedValue(deezerTracks);

      const result = await useCase.execute("sp-artist-1", "album-1");

      expect(result).toEqual(deezerTracks);
      // Should not try to persist since no cache row exists
      expect(repo.updateArtistAlbumIdentities).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: All providers return empty", () => {
    it("returns empty array when no provider resolves", async () => {
      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
        id: "sp-artist-1:album-1",
        spotifyArtistId: "sp-artist-1",
        albumId: "album-1",
        albumName: "Album One",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        deezerAlbumId: null,
        mbAlbumId: null,
        artistName: "Test Artist",
      });
      vi.mocked(deezerClient.searchAlbum).mockResolvedValue(null);
      vi.mocked(musicBrainzClient.getReleaseTracks).mockResolvedValue([]);

      const result = await useCase.execute("sp-artist-1", "album-1");

      expect(result).toEqual([]);
    });
  });
});

describe("GetAlbumTracksUseCase — AlbumTracksCachePort", () => {
  let repo: FeedRepository;
  let deezerClient: DeezerClient;
  let musicBrainzClient: MusicBrainzClient;
  let spotifyAlbumClient: SpotifyAlbumClient;
  let cache: AlbumTracksCachePort;

  beforeEach(() => {
    repo = mockRepo();
    deezerClient = mockDeezerClient();
    musicBrainzClient = mockMusicBrainzClient();
    spotifyAlbumClient = mockSpotifyAlbumClient();
    cache = mockAlbumTracksCache();
  });

  describe("Scenario: Cache hit returns tracks directly", () => {
    it("returns cached tracks without calling any provider", async () => {
      const cachedTracks = [makeNormalizedTrack({ name: "Cached Track" })];
      vi.mocked(cache.get).mockResolvedValue(cachedTracks);

      const useCaseWithCache = new GetAlbumTracksUseCase(
        repo,
        deezerClient,
        musicBrainzClient,
        spotifyAlbumClient,
        cache,
      );

      const result = await useCaseWithCache.execute("sp-artist-1", "album-1");

      expect(result).toEqual(cachedTracks);
      expect(cache.get).toHaveBeenCalledWith("sp-artist-1", "album-1");
      expect(repo.getArtistAlbumWithArtist).not.toHaveBeenCalled();
      expect(deezerClient.searchAlbum).not.toHaveBeenCalled();
      expect(deezerClient.getAlbumTracks).not.toHaveBeenCalled();
      expect(musicBrainzClient.getReleaseTracks).not.toHaveBeenCalled();
      expect(spotifyAlbumClient.getAlbumTracks).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: Cache miss falls through to cascade and populates cache", () => {
    it("runs cascade on cache miss and calls cache.set with the result", async () => {
      const deezerTracks = [makeNormalizedTrack({ name: "Deezer Track" })];
      vi.mocked(cache.get).mockResolvedValue(null);
      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
        id: "sp-artist-1:album-1",
        spotifyArtistId: "sp-artist-1",
        albumId: "album-1",
        albumName: "Album One",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        deezerAlbumId: "dz-123",
        mbAlbumId: null,
        artistName: "Test Artist",
      });
      vi.mocked(deezerClient.getAlbumTracks).mockResolvedValue(deezerTracks);

      const useCaseWithCache = new GetAlbumTracksUseCase(
        repo,
        deezerClient,
        musicBrainzClient,
        spotifyAlbumClient,
        cache,
      );

      const result = await useCaseWithCache.execute("sp-artist-1", "album-1");

      expect(result).toEqual(deezerTracks);
      expect(cache.get).toHaveBeenCalledWith("sp-artist-1", "album-1");
      expect(cache.set).toHaveBeenCalledWith("sp-artist-1", "album-1", deezerTracks);
      expect(deezerClient.getAlbumTracks).toHaveBeenCalledWith("dz-123");
    });
  });

  describe("Scenario: Cache port is optional (backward compat — Noop by default)", () => {
    it("works without providing a cache port (no error thrown)", async () => {
      const deezerTracks = [makeNormalizedTrack()];
      vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
        id: "sp-artist-1:album-1",
        spotifyArtistId: "sp-artist-1",
        albumId: "album-1",
        albumName: "Album One",
        albumType: "album",
        releaseDate: "2024-01-01",
        coverUrl: null,
        spotifyUrl: null,
        totalTracks: 10,
        deezerAlbumId: "dz-999",
        mbAlbumId: null,
        artistName: "Test Artist",
      });
      vi.mocked(deezerClient.getAlbumTracks).mockResolvedValue(deezerTracks);

      // Instantiate without cache port — default NOOP should be used
      const useCaseNoCache = new GetAlbumTracksUseCase(
        repo,
        deezerClient,
        musicBrainzClient,
        spotifyAlbumClient,
      );

      const result = await useCaseNoCache.execute("sp-artist-1", "album-1");

      expect(result).toEqual(deezerTracks);
    });
  });
});
