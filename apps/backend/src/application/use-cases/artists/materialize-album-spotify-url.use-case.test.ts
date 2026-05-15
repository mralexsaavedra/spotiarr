import type { ArtistRelease } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import type { SpotifySearchClient } from "@/infrastructure/external/spotify-search.client";
import { MaterializeAlbumSpotifyUrlUseCase } from "./materialize-album-spotify-url.use-case";

function makeAlbum(overrides: Partial<ArtistRelease> = {}): ArtistRelease {
  return {
    artistId: "artist-1",
    artistName: "Test Artist",
    artistImageUrl: null,
    albumId: "album-1",
    albumName: "Test Album",
    albumType: "album",
    releaseDate: "2026-01-01",
    coverUrl: null,
    spotifyUrl: "https://open.spotify.com/album/found",
    totalTracks: 10,
    ...overrides,
  };
}

function mockRepo(partial: Partial<FeedRepository> = {}): FeedRepository {
  return {
    getArtistAlbumWithArtist: vi.fn().mockResolvedValue(null),
    getArtistReleaseWithArtist: vi.fn().mockResolvedValue(null),
    upsertArtistAlbumSpotifyUrl: vi.fn().mockResolvedValue(undefined),
    updateArtistReleaseSpotifyUrl: vi.fn().mockResolvedValue(undefined),
    ...partial,
  } as unknown as FeedRepository;
}

function mockSpotifySearch(partial: Partial<SpotifySearchClient> = {}): SpotifySearchClient {
  return {
    searchAlbumByName: vi.fn().mockResolvedValue(makeAlbum()),
    ...partial,
  } as unknown as SpotifySearchClient;
}

describe("MaterializeAlbumSpotifyUrlUseCase", () => {
  let repo: FeedRepository;
  let spotifySearchClient: SpotifySearchClient;
  let useCase: MaterializeAlbumSpotifyUrlUseCase;

  beforeEach(() => {
    repo = mockRepo();
    spotifySearchClient = mockSpotifySearch();
    useCase = new MaterializeAlbumSpotifyUrlUseCase(repo, spotifySearchClient);
  });

  it("returns cached ArtistAlbumCache spotifyUrl without searching Spotify", async () => {
    vi.mocked(repo.getArtistAlbumWithArtist).mockResolvedValue({
      id: "artist-1:album-1",
      spotifyArtistId: "artist-1",
      albumId: "album-1",
      albumName: "Test Album",
      albumType: "album",
      releaseDate: "2026-01-01",
      coverUrl: null,
      spotifyUrl: "https://open.spotify.com/album/cached",
      totalTracks: 10,
      deezerAlbumId: null,
      mbAlbumId: null,
      artistName: "Test Artist",
    });

    const result = await useCase.execute({
      artistId: "artist-1",
      albumId: "album-1",
      artistName: "Test Artist",
      albumName: "Test Album",
    });

    expect(result).toEqual({ spotifyUrl: "https://open.spotify.com/album/cached" });
    expect(spotifySearchClient.searchAlbumByName).not.toHaveBeenCalled();
  });

  it("searches Spotify on cache miss and persists the found URL", async () => {
    const result = await useCase.execute({
      artistId: "artist-1",
      albumId: "album-1",
      artistName: "Test Artist",
      albumName: "Test Album",
    });

    expect(spotifySearchClient.searchAlbumByName).toHaveBeenCalledWith("Test Artist", "Test Album");
    expect(repo.upsertArtistAlbumSpotifyUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        artistId: "artist-1",
        albumId: "album-1",
        albumName: "Test Album",
        spotifyUrl: "https://open.spotify.com/album/found",
      }),
    );
    expect(repo.updateArtistReleaseSpotifyUrl).toHaveBeenCalledWith(
      "artist-1",
      "album-1",
      "https://open.spotify.com/album/found",
    );
    expect(result).toEqual({ spotifyUrl: "https://open.spotify.com/album/found" });
  });

  it("persists release cache hit into ArtistAlbumCache", async () => {
    vi.mocked(repo.getArtistReleaseWithArtist).mockResolvedValue({
      id: "artist-1:album-1",
      artistId: "artist-1",
      albumId: "album-1",
      albumName: "Release Album",
      albumType: "single",
      releaseDate: "2026-01-01",
      coverUrl: null,
      spotifyUrl: "https://open.spotify.com/album/release-cache",
      artistName: "Test Artist",
    });

    const result = await useCase.execute({
      artistId: "artist-1",
      albumId: "album-1",
      artistName: "Test Artist",
      albumName: "Test Album",
    });

    expect(spotifySearchClient.searchAlbumByName).not.toHaveBeenCalled();
    expect(repo.upsertArtistAlbumSpotifyUrl).toHaveBeenCalledWith(
      expect.objectContaining({ spotifyUrl: "https://open.spotify.com/album/release-cache" }),
    );
    expect(result).toEqual({ spotifyUrl: "https://open.spotify.com/album/release-cache" });
  });

  it("fails safely when Spotify cannot resolve an album URL", async () => {
    vi.mocked(spotifySearchClient.searchAlbumByName).mockResolvedValue(null);

    await expect(
      useCase.execute({
        artistId: "artist-1",
        albumId: "album-1",
        artistName: "Test Artist",
        albumName: "Missing Album",
      }),
    ).rejects.toMatchObject({ errorCode: "spotify_album_url_not_found", statusCode: 404 });
    expect(repo.upsertArtistAlbumSpotifyUrl).not.toHaveBeenCalled();
  });
});
