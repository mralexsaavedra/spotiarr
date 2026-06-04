import { describe, expect, it, vi } from "vitest";
import { GetMyPlaylistsUseCase } from "./get-my-playlists.use-case";

const makeDeps = () => {
  const spotifyService = {
    getMyPlaylists: vi.fn(),
  };
  const playlistCache = {
    get: vi.fn(),
    set: vi.fn(),
    invalidate: vi.fn(),
  };
  return { spotifyService, playlistCache };
};

const cachedPlaylists = [
  {
    id: "p1",
    name: "Cached",
    image: null,
    owner: "me",
    tracks: 10,
    spotifyUrl: "https://open.spotify.com/playlist/p1",
  },
];
const freshPlaylists = [
  {
    id: "p2",
    name: "Fresh",
    image: null,
    owner: "me",
    tracks: 5,
    spotifyUrl: "https://open.spotify.com/playlist/p2",
  },
];

describe("GetMyPlaylistsUseCase", () => {
  it("PLC-3a: returns cached payload without calling Spotify on cache hit", async () => {
    const { spotifyService, playlistCache } = makeDeps();
    playlistCache.get.mockResolvedValue(cachedPlaylists);
    const useCase = new GetMyPlaylistsUseCase(spotifyService as any, playlistCache as any);

    const result = await useCase.execute();

    expect(result).toEqual(cachedPlaylists);
    expect(spotifyService.getMyPlaylists).not.toHaveBeenCalled();
  });

  it("PLC-3b: calls Spotify and writes to cache on cache miss", async () => {
    const { spotifyService, playlistCache } = makeDeps();
    playlistCache.get.mockResolvedValue(null);
    spotifyService.getMyPlaylists.mockResolvedValue(freshPlaylists);
    const useCase = new GetMyPlaylistsUseCase(spotifyService as any, playlistCache as any);

    const result = await useCase.execute();

    expect(spotifyService.getMyPlaylists).toHaveBeenCalledOnce();
    expect(playlistCache.set).toHaveBeenCalledWith(
      "my-playlists:default",
      freshPlaylists,
      86_400_000,
    );
    expect(result).toEqual(freshPlaylists);
  });

  it("PLC-3c: treats expired entry as miss (cache.get returns null for expired)", async () => {
    const { spotifyService, playlistCache } = makeDeps();
    // cache.get already returns null for expired entries (handled in repository)
    playlistCache.get.mockResolvedValue(null);
    spotifyService.getMyPlaylists.mockResolvedValue(freshPlaylists);
    const useCase = new GetMyPlaylistsUseCase(spotifyService as any, playlistCache as any);

    const result = await useCase.execute();

    expect(spotifyService.getMyPlaylists).toHaveBeenCalledOnce();
    expect(result).toEqual(freshPlaylists);
  });
});
