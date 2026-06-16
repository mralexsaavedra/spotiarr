import { TrackStatusEnum } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateTrackUseCase } from "./update-track.use-case";

describe("UpdateTrackUseCase", () => {
  const trackRepository = {
    update: vi.fn().mockResolvedValue(undefined),
    updateStatusIf: vi.fn(),
  };

  let useCase: UpdateTrackUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    useCase = new UpdateTrackUseCase(trackRepository as never);
  });

  it("execute delegates an unconditional update to the repository", async () => {
    await useCase.execute("track-1", { status: TrackStatusEnum.Completed });

    expect(trackRepository.update).toHaveBeenCalledWith("track-1", {
      status: TrackStatusEnum.Completed,
    });
  });

  describe("executeIfStatus (CAS)", () => {
    it("delegates to repository.updateStatusIf with the expected status and patch", async () => {
      trackRepository.updateStatusIf.mockResolvedValue(true);

      const applied = await useCase.executeIfStatus("track-1", TrackStatusEnum.Searching, {
        status: TrackStatusEnum.Error,
        error: "stuck",
      });

      expect(applied).toBe(true);
      expect(trackRepository.updateStatusIf).toHaveBeenCalledWith(
        "track-1",
        TrackStatusEnum.Searching,
        { status: TrackStatusEnum.Error, error: "stuck" },
      );
    });

    it("returns false when the row moved out of the expected status (no clobber)", async () => {
      trackRepository.updateStatusIf.mockResolvedValue(false);

      const applied = await useCase.executeIfStatus("track-1", TrackStatusEnum.Downloading, {
        status: TrackStatusEnum.Error,
        error: "stuck",
      });

      expect(applied).toBe(false);
    });
  });
});
