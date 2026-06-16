import { describe, expect, it, vi } from "vitest";
import { PlaylistStatusEnum, TrackStatusEnum } from "@spotiarr/shared";
import { Playlist } from "@/domain/entities/playlist.entity";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { GetSystemStatusUseCase } from "./get-system-status.use-case";
import type { IPlaylist, ITrack } from "@spotiarr/shared";

const makeTrack = (overrides: Partial<ITrack> = {}): ITrack => ({
  id: "t1",
  trackUrl: "https://open.spotify.com/track/1",
  albumUrl: "https://open.spotify.com/album/1",
  status: TrackStatusEnum.Completed,
  name: "Track",
  artist: "Artist",
  album: "Album",
  playlistId: "p1",
  ...overrides,
});

const makePlaylist = (overrides: Partial<IPlaylist> = {}): Playlist => {
  const props: IPlaylist = {
    id: "p1",
    name: "My Playlist",
    spotifyUrl: "https://open.spotify.com/playlist/abc",
    subscribed: true,
    tracks: [],
    ...overrides,
  };
  return new Playlist(props);
};

const makeDeps = () => {
  const playlistRepository: Pick<PlaylistRepository, "findAll"> = {
    findAll: vi.fn(),
  };
  return { playlistRepository };
};

const makeUseCase = (playlistRepository: Pick<PlaylistRepository, "findAll">) =>
  new GetSystemStatusUseCase(playlistRepository as unknown as PlaylistRepository);

describe("GetSystemStatusUseCase", () => {
  it("returns empty maps when there are no playlists", async () => {
    const { playlistRepository } = makeDeps();
    vi.mocked(playlistRepository.findAll).mockResolvedValue([]);

    const useCase = makeUseCase(playlistRepository);
    const result = await useCase.execute();

    expect(playlistRepository.findAll).toHaveBeenCalledWith(true);
    expect(result).toEqual({
      playlistStatusMap: {},
      trackStatusMap: {},
      albumTrackCountMap: {},
    });
  });

  it("maps playlist status by spotifyUrl", async () => {
    const { playlistRepository } = makeDeps();
    const completedTrack = makeTrack({ status: TrackStatusEnum.Completed });
    const playlist = makePlaylist({
      spotifyUrl: "https://open.spotify.com/playlist/abc",
      tracks: [completedTrack],
    });
    vi.mocked(playlistRepository.findAll).mockResolvedValue([playlist]);

    const useCase = makeUseCase(playlistRepository);
    const result = await useCase.execute();

    expect(result.playlistStatusMap).toEqual({
      "https://open.spotify.com/playlist/abc": PlaylistStatusEnum.Completed,
    });
  });

  it("maps track status by trackUrl", async () => {
    const { playlistRepository } = makeDeps();
    const track = makeTrack({
      trackUrl: "https://open.spotify.com/track/x",
      status: TrackStatusEnum.Error,
    });
    const playlist = makePlaylist({ tracks: [track] });
    vi.mocked(playlistRepository.findAll).mockResolvedValue([playlist]);

    const useCase = makeUseCase(playlistRepository);
    const result = await useCase.execute();

    expect(result.trackStatusMap["https://open.spotify.com/track/x"]).toBe(TrackStatusEnum.Error);
  });

  it("counts completed tracks per albumUrl in albumTrackCountMap", async () => {
    const { playlistRepository } = makeDeps();
    const albumUrl = "https://open.spotify.com/album/a";
    const t1 = makeTrack({ id: "t1", trackUrl: "https://open.spotify.com/track/1", albumUrl, status: TrackStatusEnum.Completed });
    const t2 = makeTrack({ id: "t2", trackUrl: "https://open.spotify.com/track/2", albumUrl, status: TrackStatusEnum.Completed });
    const t3 = makeTrack({ id: "t3", trackUrl: "https://open.spotify.com/track/3", albumUrl, status: TrackStatusEnum.Error });
    const playlist = makePlaylist({ tracks: [t1, t2, t3] });
    vi.mocked(playlistRepository.findAll).mockResolvedValue([playlist]);

    const useCase = makeUseCase(playlistRepository);
    const result = await useCase.execute();

    // Only completed tracks count
    expect(result.albumTrackCountMap[albumUrl]).toBe(2);
  });

  it("does not add to albumTrackCountMap for non-completed tracks", async () => {
    const { playlistRepository } = makeDeps();
    const track = makeTrack({ status: TrackStatusEnum.Error });
    const playlist = makePlaylist({ tracks: [track] });
    vi.mocked(playlistRepository.findAll).mockResolvedValue([playlist]);

    const useCase = makeUseCase(playlistRepository);
    const result = await useCase.execute();

    expect(Object.keys(result.albumTrackCountMap)).toHaveLength(0);
  });

  it("skips playlist without spotifyUrl in playlistStatusMap", async () => {
    const { playlistRepository } = makeDeps();
    const playlist = makePlaylist({ spotifyUrl: undefined });
    vi.mocked(playlistRepository.findAll).mockResolvedValue([playlist]);

    const useCase = makeUseCase(playlistRepository);
    const result = await useCase.execute();

    expect(Object.keys(result.playlistStatusMap)).toHaveLength(0);
  });

  it("skips tracks without trackUrl or status in trackStatusMap", async () => {
    const { playlistRepository } = makeDeps();
    const track = makeTrack({ trackUrl: undefined, status: undefined });
    const playlist = makePlaylist({ tracks: [track] });
    vi.mocked(playlistRepository.findAll).mockResolvedValue([playlist]);

    const useCase = makeUseCase(playlistRepository);
    const result = await useCase.execute();

    expect(Object.keys(result.trackStatusMap)).toHaveLength(0);
  });

  it("handles playlists with no tracks array gracefully", async () => {
    const { playlistRepository } = makeDeps();
    const playlist = makePlaylist({ tracks: undefined });
    vi.mocked(playlistRepository.findAll).mockResolvedValue([playlist]);

    const useCase = makeUseCase(playlistRepository);
    const result = await useCase.execute();

    expect(result.trackStatusMap).toEqual({});
    expect(result.albumTrackCountMap).toEqual({});
  });

  it("aggregates album counts across multiple playlists", async () => {
    const { playlistRepository } = makeDeps();
    const albumUrl = "https://open.spotify.com/album/shared";
    const t1 = makeTrack({ id: "t1", trackUrl: "https://open.spotify.com/track/1", albumUrl, status: TrackStatusEnum.Completed });
    const t2 = makeTrack({ id: "t2", trackUrl: "https://open.spotify.com/track/2", albumUrl, status: TrackStatusEnum.Completed });
    const p1 = makePlaylist({ id: "p1", spotifyUrl: "https://open.spotify.com/playlist/1", tracks: [t1] });
    const p2 = makePlaylist({ id: "p2", spotifyUrl: "https://open.spotify.com/playlist/2", tracks: [t2] });
    vi.mocked(playlistRepository.findAll).mockResolvedValue([p1, p2]);

    const useCase = makeUseCase(playlistRepository);
    const result = await useCase.execute();

    expect(result.albumTrackCountMap[albumUrl]).toBe(2);
  });

  it("propagates repository errors", async () => {
    const { playlistRepository } = makeDeps();
    vi.mocked(playlistRepository.findAll).mockRejectedValue(new Error("db error"));

    const useCase = makeUseCase(playlistRepository);

    await expect(useCase.execute()).rejects.toThrow("db error");
  });
});
