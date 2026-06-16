import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Track } from "@/domain/entities/track.entity";
import { RecoverErroredTracksUseCase } from "./recover-errored-tracks.use-case";

function makeErrorTrack(overrides: Partial<ITrack> = {}): Track {
  return new Track({
    id: "track-err-1",
    name: "Song",
    artist: "Artist",
    status: TrackStatusEnum.Error,
    searchAttempts: 0,
    playlistId: "playlist-1",
    ...overrides,
  });
}

describe("RecoverErroredTracksUseCase", () => {
  const trackRepository = {
    findAllByStatuses: vi.fn(),
  };

  const retryTrackDownloadUseCase = {
    execute: vi.fn(),
  };

  const spotifyCircuitBreaker = {
    isOpen: vi.fn(() => false),
  };

  const settingsService = {
    getNumber: vi.fn((key: string) => {
      if (key === "SEARCH_MAX_ATTEMPTS") return Promise.resolve(5);
      return Promise.resolve(0);
    }),
  };

  const eventBus = {
    emit: vi.fn(),
  };

  let useCase: RecoverErroredTracksUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    spotifyCircuitBreaker.isOpen.mockReturnValue(false);
    settingsService.getNumber.mockImplementation((key: string) => {
      if (key === "SEARCH_MAX_ATTEMPTS") return Promise.resolve(5);
      return Promise.resolve(0);
    });
    useCase = new RecoverErroredTracksUseCase(
      trackRepository as never,
      retryTrackDownloadUseCase as never,
      spotifyCircuitBreaker as never,
      settingsService as never,
      eventBus as never,
    );
  });

  it("R5-S1: re-enqueues a track from a spotiarr:// synthetic playlist", async () => {
    const track = makeErrorTrack({ id: "track-synthetic", playlistId: "playlist-synthetic" });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-synthetic");
  });

  it("R5-S2: re-enqueues a track from an Album-type playlist", async () => {
    const track = makeErrorTrack({ id: "track-album", playlistId: "playlist-album" });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-album");
  });

  it("R5-S3: re-enqueues a track from a non-subscribed playlist", async () => {
    const track = makeErrorTrack({ id: "track-nosub", playlistId: "playlist-nosub" });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-nosub");
  });

  it("R5-S4: when circuit breaker is open, returns early without enqueuing any track", async () => {
    spotifyCircuitBreaker.isOpen.mockReturnValue(true);
    const track = makeErrorTrack({ id: "track-deferred" });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("R5-S4: circuit breaker open does NOT increment searchAttempts", async () => {
    spotifyCircuitBreaker.isOpen.mockReturnValue(true);
    const track = makeErrorTrack({ id: "track-deferred", searchAttempts: 4 });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
    expect(track.searchAttempts).toBe(4);
  });

  it("R4-S1 cross-check: skips a track that has reached the attempt cap", async () => {
    const track = makeErrorTrack({ id: "track-capped", searchAttempts: 5 });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });

  it("R4-S1 cross-check: skips a track with a terminal error code (isTerminalError)", async () => {
    const track = makeErrorTrack({ id: "track-terminal", error: "youtube_not_found" });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).not.toHaveBeenCalled();
  });

  it("skips terminal tracks but still enqueues eligible tracks in the same batch", async () => {
    const terminalTrack = makeErrorTrack({ id: "track-terminal", error: "youtube_not_found" });
    const eligibleTrack = makeErrorTrack({ id: "track-eligible", searchAttempts: 2 });
    trackRepository.findAllByStatuses.mockResolvedValue([terminalTrack, eligibleTrack]);

    await useCase.execute();

    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledTimes(1);
    expect(retryTrackDownloadUseCase.execute).toHaveBeenCalledWith("track-eligible");
  });

  it("emits playlists-updated when at least one track is recovered", async () => {
    const track = makeErrorTrack({ id: "track-ok" });
    trackRepository.findAllByStatuses.mockResolvedValue([track]);

    await useCase.execute();

    expect(eventBus.emit).toHaveBeenCalledWith("playlists-updated");
  });

  it("does not emit playlists-updated when no tracks are recovered", async () => {
    trackRepository.findAllByStatuses.mockResolvedValue([]);

    await useCase.execute();

    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("queries the repository for Error-status tracks", async () => {
    trackRepository.findAllByStatuses.mockResolvedValue([]);

    await useCase.execute();

    expect(trackRepository.findAllByStatuses).toHaveBeenCalledWith([TrackStatusEnum.Error]);
  });
});
