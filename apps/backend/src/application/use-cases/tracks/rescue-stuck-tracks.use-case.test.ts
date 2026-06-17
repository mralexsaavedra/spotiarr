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

  it("re-enqueues every stuck track across mixed statuses", async () => {
    trackRepository.findAllByStatuses.mockResolvedValue([
      makeTrack({ id: "track-new", status: TrackStatusEnum.New }),
      makeTrack({ id: "track-searching", status: TrackStatusEnum.Searching }),
      makeTrack({ id: "track-queued", status: TrackStatusEnum.Queued }),
    ]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledTimes(3);
    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-new");
    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-searching");
    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-queued");
  });

  it("does nothing when there are no stuck tracks", async () => {
    trackRepository.findAllByStatuses.mockResolvedValue([]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });

  it("skips tracks without id", async () => {
    trackRepository.findAllByStatuses.mockResolvedValue([
      { id: undefined, status: TrackStatusEnum.New, name: "T", artist: "A" } as any,
    ]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });

  it("skips tracks without status", async () => {
    trackRepository.findAllByStatuses.mockResolvedValue([
      { id: "track-no-status", status: undefined, name: "T", artist: "A" } as any,
    ]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });

  it("continues to next track when retryTrackDownloadUseCase throws and does not rethrow", async () => {
    trackRepository.findAllByStatuses.mockResolvedValue([
      makeTrack({ id: "track-fail", status: TrackStatusEnum.New }),
      makeTrack({ id: "track-ok", status: TrackStatusEnum.New }),
    ]);
    retryTrackDownloadUseCase.execute
      .mockRejectedValueOnce(new Error("download failed"))
      .mockResolvedValueOnce(undefined);

    await expect(useCase.execute()).resolves.toBeUndefined();

    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledTimes(2);
    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-fail");
    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-ok");
  });

  it("rescues only tracks that succeed when one errors", async () => {
    trackRepository.findAllByStatuses.mockResolvedValue([
      makeTrack({ id: "track-fail", status: TrackStatusEnum.New }),
      makeTrack({ id: "track-ok", status: TrackStatusEnum.New }),
    ]);
    retryTrackDownloadUseCase.execute
      .mockRejectedValueOnce(new Error("download failed"))
      .mockResolvedValueOnce(undefined);

    // Should resolve (not throw) even with partial failure
    await expect(useCase.execute()).resolves.toBeUndefined();
    // Both tracks were attempted
    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
