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
});
