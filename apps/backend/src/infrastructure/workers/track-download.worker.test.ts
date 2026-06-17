import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";

const workerListeners: Record<string, (...args: unknown[]) => unknown> = {};

const workerOn = vi.fn((event: string, cb: (...args: unknown[]) => unknown) => {
  workerListeners[event] = cb;
});

const WorkerMock = vi.fn((..._args: unknown[]) => ({ on: workerOn }));

const trackService = {
  downloadFromYoutube: vi.fn(),
  update: vi.fn(),
};
const settingsService = { getNumber: vi.fn() };
const libraryService = { scan: vi.fn() };
const eventsController = { emit: vi.fn() };

vi.mock("bullmq", () => ({ Worker: WorkerMock }));

vi.mock("../../container", () => ({
  getContainer: () => ({ trackService, settingsService, libraryService, eventsController }),
}));

vi.mock("../setup/environment", () => ({
  getEnv: () => ({ REDIS_HOST: "localhost", REDIS_PORT: 6379 }),
}));

function makeTrack(overrides: Partial<ITrack> = {}): ITrack {
  return { id: "track-1", name: "Song", artist: "Artist", ...overrides };
}

describe("createTrackDownloadWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(workerListeners).forEach((key) => delete workerListeners[key]);
    settingsService.getNumber.mockResolvedValue(10);
    libraryService.scan.mockResolvedValue(undefined);
    trackService.update.mockResolvedValue(undefined);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("configures the BullMQ limiter from the per-minute setting", async () => {
    const { createTrackDownloadWorker } = await import("./track-download.worker");
    settingsService.getNumber.mockResolvedValue(25);

    await createTrackDownloadWorker();

    const options = WorkerMock.mock.calls[0][2] as unknown as {
      limiter: { max: number; duration: number };
    };
    expect(options.limiter).toEqual({ max: 25, duration: 60000 });
  });

  it("scans the library and emits library-updated when the queue drains", async () => {
    const { createTrackDownloadWorker } = await import("./track-download.worker");
    await createTrackDownloadWorker();

    await workerListeners.drained?.();

    expect(libraryService.scan).toHaveBeenCalledTimes(1);
    expect(eventsController.emit).toHaveBeenCalledWith("library-updated");
  });

  it("does not throw and skips the event when the post-drain scan fails", async () => {
    const { createTrackDownloadWorker } = await import("./track-download.worker");
    await createTrackDownloadWorker();
    libraryService.scan.mockRejectedValueOnce(new Error("scan failed"));

    await expect(workerListeners.drained?.()).resolves.toBeUndefined();
    expect(eventsController.emit).not.toHaveBeenCalledWith("library-updated");
    expect(console.error).toHaveBeenCalled();
  });

  it("marks the track as Error and emits playlists-updated on a failed job", async () => {
    const { createTrackDownloadWorker } = await import("./track-download.worker");
    await createTrackDownloadWorker();

    await workerListeners.failed?.({ id: "job-1", data: makeTrack() }, new Error("download died"));

    expect(trackService.update).toHaveBeenCalledWith(
      "track-1",
      expect.objectContaining({ status: TrackStatusEnum.Error, error: "download died" }),
    );
    expect(eventsController.emit).toHaveBeenCalledWith("playlists-updated");
  });

  it("ignores a failed job whose payload carries no track id", async () => {
    const { createTrackDownloadWorker } = await import("./track-download.worker");
    await createTrackDownloadWorker();

    await workerListeners.failed?.({ id: "job-2", data: {} }, new Error("download died"));

    expect(trackService.update).not.toHaveBeenCalled();
  });

  it("calls downloadFromYoutube with the job track data in the processor", async () => {
    const { createTrackDownloadWorker } = await import("./track-download.worker");
    await createTrackDownloadWorker();

    const processor = (WorkerMock.mock.calls[0] as unknown[])[1] as (job: {
      data: unknown;
    }) => Promise<void>;

    const track = makeTrack({ id: "track-7" });
    trackService.downloadFromYoutube.mockResolvedValueOnce(undefined);

    await processor({ data: track });

    expect(trackService.downloadFromYoutube).toHaveBeenCalledWith(track);
  });

  it("logs the job id in the completed listener", async () => {
    const { createTrackDownloadWorker } = await import("./track-download.worker");
    await createTrackDownloadWorker();

    workerListeners.completed?.({ id: "job-completed-1" });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("job-completed-1"));
  });

  it("logs but does not throw when trackService.update fails in the failed handler", async () => {
    const { createTrackDownloadWorker } = await import("./track-download.worker");
    await createTrackDownloadWorker();

    trackService.update.mockRejectedValueOnce(new Error("db write error"));

    await expect(
      workerListeners.failed?.({ id: "job-3", data: makeTrack() }, new Error("download failed")),
    ).resolves.toBeUndefined();

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("track-1"),
      expect.any(Error),
    );
  });
});
