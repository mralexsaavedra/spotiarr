import { describe, expect, it, vi } from "vitest";
import type { SpotifyService } from "@/application/services/spotify.service";
import { GetMyPlaylistsUseCase } from "./get-my-playlists.use-case";

const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn().mockReturnThis(),
}));
vi.mock("@/infrastructure/logging/logger", () => ({ logger: loggerMock }));

const makeDeps = () => {
  const spotifyService = {
    getMyPlaylists: vi.fn(),
  };
  return { spotifyService };
};

const makeUseCase = (spotifyService: Pick<SpotifyService, "getMyPlaylists">) =>
  new GetMyPlaylistsUseCase(spotifyService as unknown as SpotifyService);

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
  it("calls Spotify and returns the remote playlists", async () => {
    const { spotifyService } = makeDeps();
    spotifyService.getMyPlaylists.mockResolvedValue(freshPlaylists);
    const useCase = makeUseCase(spotifyService);

    const result = await useCase.execute();

    expect(spotifyService.getMyPlaylists).toHaveBeenCalledOnce();
    expect(result).toEqual(freshPlaylists);
    expect(loggerMock.error).not.toHaveBeenCalled();
  });

  it("does not swallow Spotify errors behind cache fallbacks", async () => {
    const { spotifyService } = makeDeps();
    const failure = new Error("spotify exploded");
    spotifyService.getMyPlaylists.mockRejectedValue(failure);
    const useCase = makeUseCase(spotifyService);

    await expect(useCase.execute()).rejects.toThrow(failure);
  });

  it("returns the latest Spotify payload on consecutive executions", async () => {
    const { spotifyService } = makeDeps();
    spotifyService.getMyPlaylists.mockResolvedValue(freshPlaylists);
    const useCase = makeUseCase(spotifyService);

    const first = await useCase.execute();
    spotifyService.getMyPlaylists.mockResolvedValue([
      ...freshPlaylists,
      {
        id: "p3",
        name: "Newest",
        image: null,
        owner: "me",
        tracks: 2,
        spotifyUrl: "https://open.spotify.com/playlist/p3",
      },
    ]);
    const second = await useCase.execute();

    expect(first).toEqual(freshPlaylists);
    expect(second).toHaveLength(2);
    expect(spotifyService.getMyPlaylists).toHaveBeenCalledTimes(2);
  });
});
