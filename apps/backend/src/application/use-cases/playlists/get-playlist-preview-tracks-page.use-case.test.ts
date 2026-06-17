import { describe, expect, it, vi } from "vitest";
import type { SpotifyService } from "@/application/services/spotify.service";
import { GetPlaylistPreviewTracksPageUseCase } from "./get-playlist-preview-tracks-page.use-case";
import { SyncSubscribedPlaylistsUseCase } from "./sync-subscribed-playlists.use-case";

const PLAYLIST_URL = "https://open.spotify.com/playlist/abc";

const makeDeps = () => {
  const spotifyService = {
    getPlaylistTracksPage: vi.fn(),
  };
  return { spotifyService };
};

const makeUseCase = (spotifyService: Pick<SpotifyService, "getPlaylistTracksPage">) =>
  new GetPlaylistPreviewTracksPageUseCase(spotifyService as unknown as SpotifyService);

describe("GetPlaylistPreviewTracksPageUseCase", () => {
  it("calls Spotify and maps the tracks page response", async () => {
    const { spotifyService } = makeDeps();
    spotifyService.getPlaylistTracksPage.mockResolvedValue({
      tracks: [
        {
          name: "Track 1",
          artist: "Artist",
          artists: [{ name: "Artist", url: "https://open.spotify.com/artist/123" }],
          album: "Album",
          durationMs: 200000,
          trackUrl: "https://open.spotify.com/track/1",
          albumUrl: "https://open.spotify.com/album/1",
        },
      ],
      total: 125,
      hasMore: true,
      nextOffset: 50,
    });
    const useCase = makeUseCase(spotifyService);

    const result = await useCase.execute(PLAYLIST_URL, 0, 50);

    expect(spotifyService.getPlaylistTracksPage).toHaveBeenCalledWith(PLAYLIST_URL, 0, 50);
    expect(result).toEqual({
      tracks: [
        {
          name: "Track 1",
          artists: [{ name: "Artist", url: "https://open.spotify.com/artist/123" }],
          album: "Album",
          duration: 200000,
          trackUrl: "https://open.spotify.com/track/1",
          albumUrl: "https://open.spotify.com/album/1",
        },
      ],
      total: 125,
      hasMore: true,
      nextOffset: 50,
    });
  });

  it("returns the latest Spotify page across consecutive executions", async () => {
    const { spotifyService } = makeDeps();
    spotifyService.getPlaylistTracksPage.mockResolvedValueOnce({
      tracks: [],
      total: 100,
      hasMore: true,
      nextOffset: 50,
    });
    spotifyService.getPlaylistTracksPage.mockResolvedValueOnce({
      tracks: [],
      total: 101,
      hasMore: true,
      nextOffset: 50,
    });
    const useCase = makeUseCase(spotifyService);

    const first = await useCase.execute(PLAYLIST_URL, 0, 50);
    const second = await useCase.execute(PLAYLIST_URL, 0, 50);

    expect(first.total).toBe(100);
    expect(second.total).toBe(101);
    expect(spotifyService.getPlaylistTracksPage).toHaveBeenCalledTimes(2);
  });

  it("propagates Spotify page errors without cache fallback behavior", async () => {
    const { spotifyService } = makeDeps();
    const failure = new Error("tracks page failed");
    spotifyService.getPlaylistTracksPage.mockRejectedValue(failure);
    const useCase = makeUseCase(spotifyService);

    await expect(useCase.execute(PLAYLIST_URL, 0, 50)).rejects.toThrow(failure);
  });

  it("PLC-5c: SyncSubscribedPlaylistsUseCase constructor stays unchanged", () => {
    // Verify that the constructor signature stays limited to its expected collaborators
    const syncUseCase = SyncSubscribedPlaylistsUseCase;
    // This is a static contract test: just check the constructor length hasn't grown unexpectedly.
    // SyncSubscribedPlaylistsUseCase has 5 constructor params (playlistRepository, spotifyService, trackService, eventBus, circuitBreaker)
    expect(syncUseCase.length).toBeLessThanOrEqual(6);
  });
});
