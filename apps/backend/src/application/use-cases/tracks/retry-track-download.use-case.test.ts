import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import { Track } from "@/domain/entities/track.entity";
import { RetryTrackDownloadUseCase } from "./retry-track-download.use-case";

const makeTrack = (overrides: Partial<ITrack> = {}): Track =>
  new Track({
    id: "track-1",
    name: "Song A",
    artist: "Artist A",
    status: TrackStatusEnum.Error,
    playlistId: "playlist-1",
    youtubeUrl: "https://youtube.com/watch?v=abc",
    spotifyUrl: undefined,
    trackUrl: undefined,
    searchAttempts: 1,
    error: "some_error",
    ...overrides,
  });

describe("RetryTrackDownloadUseCase", () => {
  const trackRepository = {
    findOneWithPlaylist: vi.fn(),
    update: vi.fn(),
  };

  const queueService = {
    enqueueSearchTrack: vi.fn(),
  };

  let useCase: RetryTrackDownloadUseCase;

  beforeEach(() => {
    vi.resetAllMocks();
    trackRepository.update.mockResolvedValue(undefined);
    queueService.enqueueSearchTrack.mockResolvedValue(undefined);
    useCase = new RetryTrackDownloadUseCase(trackRepository as never, queueService as never);
  });

  describe("when the track exists", () => {
    it("marks the track as new, updates the repository, and enqueues for search", async () => {
      const track = makeTrack();
      trackRepository.findOneWithPlaylist.mockResolvedValue(track);

      await useCase.execute("track-1");

      expect(trackRepository.findOneWithPlaylist).toHaveBeenCalledWith("track-1");
      expect(trackRepository.update).toHaveBeenCalledWith("track-1", track);
      expect(queueService.enqueueSearchTrack).toHaveBeenCalledWith(track.toPrimitive());
    });

    it("resets the track status to New via markAsNew before persisting", async () => {
      const track = makeTrack({ status: TrackStatusEnum.Error, error: "some_error" });
      trackRepository.findOneWithPlaylist.mockResolvedValue(track);

      await useCase.execute("track-1");

      const updatedArg = trackRepository.update.mock.calls[0][1] as Track;
      expect(updatedArg.status).toBe(TrackStatusEnum.New);
    });

    it("clears the error field on the track after markAsNew", async () => {
      const track = makeTrack({ error: "previous_error" });
      trackRepository.findOneWithPlaylist.mockResolvedValue(track);

      await useCase.execute("track-1");

      const primitive = queueService.enqueueSearchTrack.mock.calls[0][0] as ITrack;
      expect(primitive.error).toBeUndefined();
    });

    it("enqueues the primitive representation of the mutated track", async () => {
      const track = makeTrack();
      trackRepository.findOneWithPlaylist.mockResolvedValue(track);

      await useCase.execute("track-1");

      const enqueueArg = queueService.enqueueSearchTrack.mock.calls[0][0];
      expect(enqueueArg).toEqual(track.toPrimitive());
    });
  });

  describe("when the track does not exist", () => {
    it("throws AppError 404 with errorCode track_not_found", async () => {
      trackRepository.findOneWithPlaylist.mockResolvedValue(null);

      const error = await useCase.execute("missing-id").catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe("track_not_found");
    });

    it("does not call update or enqueue when the track is missing", async () => {
      trackRepository.findOneWithPlaylist.mockResolvedValue(null);

      await expect(useCase.execute("missing-id")).rejects.toThrow();
      expect(trackRepository.update).not.toHaveBeenCalled();
      expect(queueService.enqueueSearchTrack).not.toHaveBeenCalled();
    });
  });

  it("propagates repository findOneWithPlaylist errors", async () => {
    trackRepository.findOneWithPlaylist.mockRejectedValue(new Error("db failure"));

    await expect(useCase.execute("track-1")).rejects.toThrow("db failure");
    expect(queueService.enqueueSearchTrack).not.toHaveBeenCalled();
  });

  it("propagates repository update errors", async () => {
    const track = makeTrack();
    trackRepository.findOneWithPlaylist.mockResolvedValue(track);
    trackRepository.update.mockRejectedValue(new Error("update failure"));

    await expect(useCase.execute("track-1")).rejects.toThrow("update failure");
    expect(queueService.enqueueSearchTrack).not.toHaveBeenCalled();
  });

  it("propagates queue service errors", async () => {
    const track = makeTrack();
    trackRepository.findOneWithPlaylist.mockResolvedValue(track);
    queueService.enqueueSearchTrack.mockRejectedValue(new Error("queue failure"));

    await expect(useCase.execute("track-1")).rejects.toThrow("queue failure");
  });
});
