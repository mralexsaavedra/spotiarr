import { ApiRoutes, TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Playlist } from "@/domain/entities/playlist.entity";
import { Track } from "@/domain/entities/track.entity";
import { GetTracksUseCase } from "./get-tracks.use-case";

function makeTrack(input: Partial<ITrack> = {}): Track {
  return new Track({
    id: "track-1",
    name: "Track 01",
    artist: "Artist",
    trackUrl: "https://open.spotify.com/track/1",
    status: TrackStatusEnum.Completed,
    playlistId: "playlist-1",
    playlistIndex: 1,
    ...input,
  });
}

describe("GetTracksUseCase", () => {
  const trackRepository = {
    findAll: vi.fn(),
    findAllByPlaylist: vi.fn(),
    findOne: vi.fn(),
    findOneWithPlaylist: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteAll: vi.fn(),
    findStuckTracks: vi.fn(),
    findAllByStatuses: vi.fn(),
  };

  const playlistRepository = {
    findAll: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const trackPathService = {
    getMusicLibraryPath: vi.fn(),
    getTrackFileName: vi.fn(),
    getFolderName: vi.fn(),
    getPlaylistFolderPath: vi.fn(),
    getArtistFolderPath: vi.fn(),
    getAlbumFolderPath: vi.fn(),
    ensureParentDirectory: vi.fn(),
  };

  let useCase: GetTracksUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new GetTracksUseCase(
      trackRepository as never,
      playlistRepository as never,
      trackPathService as never,
    );
  });

  it("adds audioUrl for completed playlist tracks and preserves trackUrl", async () => {
    trackRepository.findAllByPlaylist.mockResolvedValue([makeTrack()]);
    playlistRepository.findOne.mockResolvedValue(
      new Playlist({ id: "playlist-1", name: "Road Trip" }),
    );
    trackPathService.getTrackFileName.mockResolvedValue(
      "/tmp/Playlists/Road Trip/01 - Artist - Track 01.mp3",
    );

    const result = await useCase.getAllByPlaylist("playlist-1");

    expect(playlistRepository.findOne).toHaveBeenCalledWith("playlist-1");
    expect(trackPathService.getTrackFileName).toHaveBeenCalledWith(
      expect.objectContaining({ id: "track-1", playlistId: "playlist-1" }),
      "Road Trip",
    );
    expect(result).toEqual([
      expect.objectContaining({
        id: "track-1",
        trackUrl: "https://open.spotify.com/track/1",
        audioUrl: `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/audio?path=${encodeURIComponent(
          "/tmp/Playlists/Road Trip/01 - Artist - Track 01.mp3",
        )}`,
      }),
    ]);
  });

  it("does not add audioUrl for tracks that are not completed", async () => {
    trackRepository.findAllByPlaylist.mockResolvedValue([
      makeTrack({ id: "track-2", status: TrackStatusEnum.Downloading }),
    ]);

    const result = await useCase.getAllByPlaylist("playlist-1");

    expect(playlistRepository.findOne).not.toHaveBeenCalled();
    expect(trackPathService.getTrackFileName).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({
      id: "track-2",
      trackUrl: "https://open.spotify.com/track/1",
    });
    expect(result[0]).not.toHaveProperty("audioUrl");
  });

  it("does not add audioUrl when the playlist cannot be resolved", async () => {
    trackRepository.findAllByPlaylist.mockResolvedValue([makeTrack()]);
    playlistRepository.findOne.mockResolvedValue(null);

    const result = await useCase.getAllByPlaylist("playlist-1");

    expect(playlistRepository.findOne).toHaveBeenCalledWith("playlist-1");
    expect(trackPathService.getTrackFileName).not.toHaveBeenCalled();
    expect(result[0]).toMatchObject({ id: "track-1" });
    expect(result[0]).not.toHaveProperty("audioUrl");
  });

  it("getAll returns all tracks mapped to primitives", async () => {
    trackRepository.findAll.mockResolvedValue([makeTrack({ id: "t-1" }), makeTrack({ id: "t-2" })]);

    const result = await useCase.getAll();

    expect(trackRepository.findAll).toHaveBeenCalledWith(undefined);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: "t-1" });
    expect(result[1]).toMatchObject({ id: "t-2" });
  });

  it("getAll passes where filter to repository", async () => {
    trackRepository.findAll.mockResolvedValue([]);

    await useCase.getAll({ status: TrackStatusEnum.Completed });

    expect(trackRepository.findAll).toHaveBeenCalledWith({ status: TrackStatusEnum.Completed });
  });

  it("get returns a single track as primitive when found", async () => {
    trackRepository.findOne.mockResolvedValue(makeTrack({ id: "track-99" }));

    const result = await useCase.get("track-99");

    expect(trackRepository.findOne).toHaveBeenCalledWith("track-99");
    expect(result).toMatchObject({ id: "track-99" });
  });

  it("get returns null when track is not found", async () => {
    trackRepository.findOne.mockResolvedValue(null);

    const result = await useCase.get("missing");

    expect(result).toBeNull();
  });

  it("findStuckTracks delegates to repository and maps to primitives", async () => {
    trackRepository.findStuckTracks.mockResolvedValue([
      makeTrack({ id: "stuck-1", status: TrackStatusEnum.Downloading }),
    ]);

    const result = await useCase.findStuckTracks([TrackStatusEnum.Downloading], 1000);

    expect(trackRepository.findStuckTracks).toHaveBeenCalledWith(
      [TrackStatusEnum.Downloading],
      1000,
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: "stuck-1" });
  });

  it("getAllByPlaylist returns items early when playlist row has no name", async () => {
    trackRepository.findAllByPlaylist.mockResolvedValue([makeTrack()]);
    // Playlist entity without a name set — name will be undefined/null → !playlistName is true
    playlistRepository.findOne.mockResolvedValue(new Playlist({ id: "playlist-1" }));

    const result = await useCase.getAllByPlaylist("playlist-1");

    expect(trackPathService.getTrackFileName).not.toHaveBeenCalled();
    expect(result[0]).not.toHaveProperty("audioUrl");
  });

  it("getAllByPlaylist skips audioUrl for non-completed tracks in a mixed playlist", async () => {
    // Mixed scenario: one Completed + one Downloading. Completed triggers the Promise.all map;
    // the non-completed item hits the `return track` branch (line 37).
    trackRepository.findAllByPlaylist.mockResolvedValue([
      makeTrack({ id: "track-completed", status: TrackStatusEnum.Completed }),
      makeTrack({ id: "track-downloading", status: TrackStatusEnum.Downloading }),
    ]);
    playlistRepository.findOne.mockResolvedValue(
      new Playlist({ id: "playlist-1", name: "Road Trip" }),
    );
    trackPathService.getTrackFileName.mockResolvedValue(
      "/tmp/Playlists/Road Trip/01 - Artist - Track 01.mp3",
    );

    const result = await useCase.getAllByPlaylist("playlist-1");

    expect(result).toHaveLength(2);
    expect(result.find((t) => t.id === "track-completed")).toHaveProperty("audioUrl");
    expect(result.find((t) => t.id === "track-downloading")).not.toHaveProperty("audioUrl");
  });
});
