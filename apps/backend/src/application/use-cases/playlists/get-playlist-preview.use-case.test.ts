import { describe, expect, it, vi } from "vitest";
import { GetPlaylistPreviewUseCase } from "./get-playlist-preview.use-case";

const PLAYLIST_URL = "https://open.spotify.com/playlist/abc";

const makeDeps = () => {
  const spotifyService = {
    getPlaylistDetail: vi.fn(),
  };
  const playlistCache = {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
  };
  return { spotifyService, playlistCache };
};

const cachedPreview = {
  name: "Cached Playlist",
  type: "playlist",
  description: null,
  coverUrl: null,
  totalTracks: 3,
  tracks: [],
};

describe("GetPlaylistPreviewUseCase", () => {
  it("PLC-4a: returns cached preview without calling Spotify on cache hit", async () => {
    const { spotifyService, playlistCache } = makeDeps();
    playlistCache.get.mockResolvedValue(cachedPreview);
    const useCase = new GetPlaylistPreviewUseCase(spotifyService as any, playlistCache as any);

    const result = await useCase.execute(PLAYLIST_URL);

    expect(result).toEqual(cachedPreview);
    expect(spotifyService.getPlaylistDetail).not.toHaveBeenCalled();
  });

  it("PLC-4b: calls Spotify and writes cache on cache miss", async () => {
    const { spotifyService, playlistCache } = makeDeps();
    playlistCache.get.mockResolvedValue(null);
    spotifyService.getPlaylistDetail.mockResolvedValue({
      name: "Fresh Playlist",
      type: "playlist",
      image: null,
      owner: "me",
      ownerUrl: undefined,
      tracks: [],
    });
    const useCase = new GetPlaylistPreviewUseCase(spotifyService as any, playlistCache as any);

    await useCase.execute(PLAYLIST_URL);

    expect(spotifyService.getPlaylistDetail).toHaveBeenCalledWith(PLAYLIST_URL, true);
    expect(playlistCache.set).toHaveBeenCalledWith(
      `preview::${PLAYLIST_URL}`,
      expect.objectContaining({ name: "Fresh Playlist" }),
      86_400_000,
    );
  });
});
