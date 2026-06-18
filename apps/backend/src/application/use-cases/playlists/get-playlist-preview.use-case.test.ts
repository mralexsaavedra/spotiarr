import { describe, expect, it, vi } from "vitest";
import type { SpotifyService } from "@/application/services/spotify.service";
import { GetPlaylistPreviewTracksPageUseCase } from "./get-playlist-preview-tracks-page.use-case";
import { GetPlaylistPreviewUseCase } from "./get-playlist-preview.use-case";

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn().mockReturnThis(),
}));
vi.mock("@/infrastructure/logging/logger", () => ({ logger: loggerMock }));

const PLAYLIST_URL = "https://open.spotify.com/playlist/abc";

const makeDeps = () => {
  const spotifyService = {
    getPlaylistDetail: vi.fn(),
    getPlaylistTracksPage: vi.fn(),
  };
  return { spotifyService };
};

const makePreviewUseCase = (
  spotifyService: Pick<SpotifyService, "getPlaylistDetail" | "getPlaylistTracksPage">,
) => new GetPlaylistPreviewUseCase(spotifyService as unknown as SpotifyService);

const makeTracksPageUseCase = (spotifyService: Pick<SpotifyService, "getPlaylistTracksPage">) =>
  new GetPlaylistPreviewTracksPageUseCase(spotifyService as unknown as SpotifyService);

describe("GetPlaylistPreviewUseCase", () => {
  it("calls Spotify and returns the preview payload directly", async () => {
    const { spotifyService } = makeDeps();
    spotifyService.getPlaylistDetail.mockResolvedValue({
      name: "Fresh Playlist",
      type: "playlist",
      image: null,
      owner: "me",
      ownerUrl: undefined,
      tracks: [],
    });
    const useCase = makePreviewUseCase(spotifyService);

    const result = await useCase.execute(PLAYLIST_URL);

    expect(spotifyService.getPlaylistDetail).toHaveBeenCalledWith(PLAYLIST_URL, true);
    expect(result).toEqual(
      expect.objectContaining({
        name: "Fresh Playlist",
        type: "playlist",
        totalTracks: 0,
      }),
    );
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it("uses the live Spotify payload instead of relying on cache-key versioning", async () => {
    const { spotifyService } = makeDeps();
    spotifyService.getPlaylistDetail.mockResolvedValue({
      name: "Fresh Playlist",
      type: "playlist",
      image: null,
      owner: "me",
      ownerUrl: undefined,
      totalTracks: 187,
      tracks: [{ name: "Track 1", artist: "Artist", artists: [], durationMs: 1000 }],
    });
    const useCase = makePreviewUseCase(spotifyService);

    const first = await useCase.execute(PLAYLIST_URL);
    spotifyService.getPlaylistDetail.mockResolvedValue({
      name: "Fresh Playlist",
      type: "playlist",
      image: null,
      owner: "me",
      ownerUrl: undefined,
      totalTracks: 188,
      tracks: [{ name: "Track 1", artist: "Artist", artists: [], durationMs: 1000 }],
    });
    const second = await useCase.execute(PLAYLIST_URL);

    expect(first.totalTracks).toBe(187);
    expect(second.totalTracks).toBe(188);
    expect(spotifyService.getPlaylistDetail).toHaveBeenCalledTimes(2);
  });

  it("uses the real playlist total instead of the preview page length", async () => {
    const { spotifyService } = makeDeps();
    spotifyService.getPlaylistDetail.mockResolvedValue({
      name: "Fresh Playlist",
      type: "playlist",
      image: null,
      owner: "me",
      ownerUrl: undefined,
      totalTracks: 75,
      tracks: [
        { name: "Track 1", artist: "Artist", artists: [], durationMs: 1000 },
        { name: "Track 2", artist: "Artist", artists: [], durationMs: 1000 },
      ],
    });
    const useCase = makePreviewUseCase(spotifyService);

    const result = await useCase.execute(PLAYLIST_URL);

    expect(result.totalTracks).toBe(75);
  });

  it("keeps preview summary totals aligned with the paged tracks total for paginated playlists", async () => {
    const { spotifyService } = makeDeps();
    spotifyService.getPlaylistDetail.mockResolvedValue({
      name: "Radio Alexander",
      type: "playlist",
      image: null,
      owner: "alex",
      ownerUrl: undefined,
      totalTracks: 187,
      tracks: Array.from({ length: 100 }, (_, index) => ({
        name: `Track ${index + 1}`,
        artist: "Artist",
        artists: [],
        durationMs: 1000,
      })),
    });
    spotifyService.getPlaylistTracksPage.mockResolvedValue({
      tracks: Array.from({ length: 100 }, (_, index) => ({
        name: `Track ${index + 1}`,
        artist: "Artist",
        artists: [],
        durationMs: 1000,
      })),
      total: 187,
      hasMore: true,
      nextOffset: 100,
    });

    const previewUseCase = makePreviewUseCase(spotifyService);
    const tracksPageUseCase = makeTracksPageUseCase(spotifyService);

    const preview = await previewUseCase.execute(PLAYLIST_URL);
    const page = await tracksPageUseCase.execute(PLAYLIST_URL, 0, 100);

    expect(preview.tracks).toHaveLength(100);
    expect(preview.totalTracks).toBe(187);
    expect(page.total).toBe(187);
    expect(preview.totalTracks).toBe(page.total);
  });

  it("reconciles paginated playlist totals when preview metadata incorrectly matches the first page size", async () => {
    const { spotifyService } = makeDeps();
    spotifyService.getPlaylistDetail.mockResolvedValue({
      name: "Radio Alexander",
      type: "playlist",
      image: null,
      owner: "alex",
      ownerUrl: undefined,
      totalTracks: 100,
      tracks: Array.from({ length: 100 }, (_, index) => ({
        name: `Track ${index + 1}`,
        artist: "Artist",
        artists: [],
        durationMs: 1000,
      })),
    });
    spotifyService.getPlaylistTracksPage.mockResolvedValue({
      tracks: Array.from({ length: 100 }, (_, index) => ({
        name: `Track ${index + 1}`,
        artist: "Artist",
        artists: [],
        durationMs: 1000,
      })),
      total: 187,
      hasMore: true,
      nextOffset: 100,
    });
    const useCase = makePreviewUseCase(spotifyService);

    const result = await useCase.execute(PLAYLIST_URL);

    expect(spotifyService.getPlaylistTracksPage).toHaveBeenCalledWith(PLAYLIST_URL, 0, 100);
    expect(result.totalTracks).toBe(187);
  });

  it("keeps exact 100-track playlists unchanged when the first page total is not larger", async () => {
    const { spotifyService } = makeDeps();
    spotifyService.getPlaylistDetail.mockResolvedValue({
      name: "Exactly One Hundred",
      type: "playlist",
      image: null,
      owner: "alex",
      ownerUrl: undefined,
      totalTracks: 100,
      tracks: Array.from({ length: 100 }, (_, index) => ({
        name: `Track ${index + 1}`,
        artist: "Artist",
        artists: [],
        durationMs: 1000,
      })),
    });
    spotifyService.getPlaylistTracksPage.mockResolvedValue({
      tracks: Array.from({ length: 100 }, (_, index) => ({
        name: `Track ${index + 1}`,
        artist: "Artist",
        artists: [],
        durationMs: 1000,
      })),
      total: 100,
      hasMore: false,
      nextOffset: null,
    });
    const useCase = makePreviewUseCase(spotifyService);

    const result = await useCase.execute(PLAYLIST_URL);

    expect(result.totalTracks).toBe(100);
  });

  it("propagates Spotify failures without cache fallback behavior", async () => {
    const { spotifyService } = makeDeps();
    const failure = new Error("preview failed");
    spotifyService.getPlaylistDetail.mockRejectedValue(failure);
    const useCase = makePreviewUseCase(spotifyService);

    await expect(useCase.execute(PLAYLIST_URL)).rejects.toThrow(failure);
  });
});
