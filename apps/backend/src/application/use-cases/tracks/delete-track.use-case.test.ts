import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import { Track } from "@/domain/entities/track.entity";
import { DeleteTrackUseCase } from "./delete-track.use-case";

const makeTrack = (overrides: Partial<ITrack> = {}): Track =>
  new Track({
    id: "track-1",
    name: "Song A",
    artist: "Artist A",
    status: TrackStatusEnum.New,
    playlistId: "playlist-1",
    youtubeUrl: undefined,
    spotifyUrl: undefined,
    trackUrl: undefined,
    searchAttempts: 0,
    ...overrides,
  });

describe("DeleteTrackUseCase", () => {
  const trackRepository = {
    findOne: vi.fn(),
    delete: vi.fn().mockResolvedValue(undefined),
  };

  let useCase: DeleteTrackUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new DeleteTrackUseCase(trackRepository as never);
  });

  describe("when the track exists", () => {
    it("calls repository.delete with the given id", async () => {
      trackRepository.findOne.mockResolvedValue(makeTrack());

      await useCase.execute("track-1");

      expect(trackRepository.findOne).toHaveBeenCalledWith("track-1");
      expect(trackRepository.delete).toHaveBeenCalledWith("track-1");
    });
  });

  describe("when the track does not exist", () => {
    it("throws AppError 404 with error code track_not_found", async () => {
      trackRepository.findOne.mockResolvedValue(null);

      await expect(useCase.execute("missing-id")).rejects.toThrow(AppError);
    });

    it("does not call delete when the track is missing", async () => {
      trackRepository.findOne.mockResolvedValue(null);

      await expect(useCase.execute("missing-id")).rejects.toThrow();
      expect(trackRepository.delete).not.toHaveBeenCalled();
    });

    it("throws with statusCode 404 and errorCode track_not_found", async () => {
      trackRepository.findOne.mockResolvedValue(null);

      const error = await useCase.execute("missing-id").catch((e) => e);

      expect(error).toBeInstanceOf(AppError);
      expect(error.statusCode).toBe(404);
      expect(error.errorCode).toBe("track_not_found");
    });
  });

  it("propagates unexpected repository errors", async () => {
    trackRepository.findOne.mockRejectedValue(new Error("db failure"));

    await expect(useCase.execute("track-1")).rejects.toThrow("db failure");
    expect(trackRepository.delete).not.toHaveBeenCalled();
  });
});
