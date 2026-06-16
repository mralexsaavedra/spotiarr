import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Track } from "@/domain/entities/track.entity";
import { RescueStuckTracksUseCase } from "./rescue-stuck-tracks.use-case";

function makeTrack(input: Partial<ITrack> = {}): Track {
  return new Track({
    id: "track-1",
    name: "Track 01",
    artist: "Artist",
    trackUrl: "https://open.spotify.com/track/1",
    status: TrackStatusEnum.New,
    playlistId: "playlist-1",
    playlistIndex: 1,
    ...input,
  });
}

describe("RescueStuckTracksUseCase", () => {
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

  const retryTrackDownloadUseCase = {
    execute: vi.fn(),
  };

  let useCase: RescueStuckTracksUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new RescueStuckTracksUseCase(
      trackRepository as never,
      retryTrackDownloadUseCase as never,
    );
  });

  it("includes New in the rescued statuses so never-searched tracks are not stranded", async () => {
    trackRepository.findAllByStatuses.mockResolvedValue([]);

    await useCase.execute();

    expect(trackRepository.findAllByStatuses).toHaveBeenCalledWith(
      expect.arrayContaining([
        TrackStatusEnum.New,
        TrackStatusEnum.Searching,
        TrackStatusEnum.Queued,
        TrackStatusEnum.Downloading,
      ]),
    );
  });

  it("re-enqueues a track stranded in New", async () => {
    trackRepository.findAllByStatuses.mockResolvedValue([
      makeTrack({ id: "track-new", status: TrackStatusEnum.New }),
    ]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-new");
  });

  it("does nothing when there are no stuck tracks", async () => {
    trackRepository.findAllByStatuses.mockResolvedValue([]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });
});
