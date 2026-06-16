import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const workerListeners: Record<string, (...args: unknown[]) => unknown> = {};

const workerOn = vi.fn((event: string, cb: (...args: unknown[]) => unknown) => {
  workerListeners[event] = cb;
});

const WorkerMock = vi.fn((..._args: unknown[]) => ({ on: workerOn }));

const trackService = {
  findOnYoutube: vi.fn(),
  update: vi.fn(),
};
const settingsService = { getNumber: vi.fn() };
const eventsController = { emit: vi.fn() };

vi.mock("bullmq", () => ({ Worker: WorkerMock }));

vi.mock("../../container", () => ({
  getContainer: () => ({ trackService, settingsService, eventsController }),
}));

vi.mock("../setup/environment", () => ({
  getEnv: () => ({ REDIS_HOST: "localhost", REDIS_PORT: 6379 }),
}));

function makeTrack(overrides: Partial<ITrack> = {}): ITrack {
  return { id: "track-1", name: "Song", artist: "Artist", ...overrides };
}

describe("createTrackSearchWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(workerListeners).forEach((key) => delete workerListeners[key]);
    settingsService.getNumber.mockResolvedValue(3);
    trackService.update.mockResolvedValue(undefined);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("configures the BullMQ worker with the search concurrency setting", async () => {
    const { createTrackSearchWorker } = await import("./track-search.worker");
    settingsService.getNumber.mockResolvedValue(5);

    await createTrackSearchWorker();

    const options = WorkerMock.mock.calls[0][2] as unknown as { concurrency: number };
    expect(options.concurrency).toBe(5);
  });

  // T2.4 — R6-S1: failed handler sets track status to Error
  describe("R6-S1: failed handler writes Error when a search job fails", () => {
    it("marks the track as Error and stores the exception message", async () => {
      const { createTrackSearchWorker } = await import("./track-search.worker");
      await createTrackSearchWorker();

      await workerListeners.failed?.(
        { id: "job-1", data: makeTrack() },
        new Error("unhandled search failure"),
      );

      expect(trackService.update).toHaveBeenCalledWith(
        "track-1",
        expect.objectContaining({
          status: TrackStatusEnum.Error,
          error: "unhandled search failure",
        }),
      );
    });

    it("emits playlists-updated after writing Error", async () => {
      const { createTrackSearchWorker } = await import("./track-search.worker");
      await createTrackSearchWorker();

      await workerListeners.failed?.(
        { id: "job-1", data: makeTrack() },
        new Error("search failed"),
      );

      expect(eventsController.emit).toHaveBeenCalledWith("playlists-updated");
    });

    it("does nothing when the failed job has no track id", async () => {
      const { createTrackSearchWorker } = await import("./track-search.worker");
      await createTrackSearchWorker();

      await workerListeners.failed?.({ id: "job-2", data: {} }, new Error("search failed"));

      expect(trackService.update).not.toHaveBeenCalled();
    });

    // R1-S3 (non-regression): failed handler triggers a write that stamps lastActivityAt
    // We verify this indirectly — trackService.update is called (which calls repo.update,
    // which stamps lastActivityAt per the existing contract from Slice 1).
    it("calls trackService.update so that lastActivityAt is stamped via the repo", async () => {
      const { createTrackSearchWorker } = await import("./track-search.worker");
      await createTrackSearchWorker();

      await workerListeners.failed?.(
        { id: "job-3", data: makeTrack({ id: "track-99" }) },
        new Error("boom"),
      );

      expect(trackService.update).toHaveBeenCalledWith("track-99", expect.anything());
    });
  });

  // T3.3 — R6-S2: failed handler increments searchAttempts
  describe("R6-S2: failed handler increments searchAttempts", () => {
    it("increments searchAttempts by 1 in the failed handler update payload", async () => {
      const { createTrackSearchWorker } = await import("./track-search.worker");
      await createTrackSearchWorker();

      const trackWithAttempts = makeTrack({ searchAttempts: 2 });
      await workerListeners.failed?.(
        { id: "job-4", data: trackWithAttempts },
        new Error("worker crash"),
      );

      expect(trackService.update).toHaveBeenCalledWith(
        "track-1",
        expect.objectContaining({
          searchAttempts: 3,
        }),
      );
    });

    it("starts searchAttempts at 1 when the track has no prior attempts", async () => {
      const { createTrackSearchWorker } = await import("./track-search.worker");
      await createTrackSearchWorker();

      await workerListeners.failed?.({ id: "job-5", data: makeTrack() }, new Error("crash"));

      expect(trackService.update).toHaveBeenCalledWith(
        "track-1",
        expect.objectContaining({
          searchAttempts: 1,
        }),
      );
    });
  });
});
