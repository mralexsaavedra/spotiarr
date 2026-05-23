import { describe, expect, it, vi, beforeEach } from "vitest";

const workerListeners: Record<string, (...args: unknown[]) => unknown> = {};

const workerOn = vi.fn((event: string, cb: (...args: unknown[]) => unknown) => {
  workerListeners[event] = cb;
});

const WorkerMock = vi.fn(() => ({
  on: workerOn,
}));

const getSyncState = vi.fn();

vi.mock("bullmq", () => ({
  Worker: WorkerMock,
}));

vi.mock("@/container", () => ({
  container: {
    spotifyUserLibrarySyncService: {},
    releaseFeedService: {},
    feedRepository: {
      getSyncState,
      setSyncState: vi.fn(),
    },
    eventBus: {
      emit: vi.fn(),
    },
    settingsService: {
      getNumber: vi.fn(),
    },
  },
}));

vi.mock("../setup/environment", () => ({
  getEnv: () => ({ REDIS_HOST: "localhost", REDIS_PORT: 6379 }),
}));

vi.mock("../setup/queues", () => ({
  FEED_SYNC_QUEUE: "feed-sync",
}));

describe("createFeedSyncWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(workerListeners).forEach((key) => {
      delete workerListeners[key];
    });
    getSyncState.mockResolvedValue({ status: "idle" });
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("logs non-fatal warning when failed-state sync check rejects", async () => {
    const { createFeedSyncWorker } = await import("./feed-sync.worker");

    createFeedSyncWorker();
    getSyncState.mockRejectedValueOnce(new Error("read failure"));

    const failedHandler = workerListeners.failed;
    expect(failedHandler).toBeTypeOf("function");

    await failedHandler?.({ id: "job-1" }, new Error("job failed"));
    await Promise.resolve();

    expect(console.warn).toHaveBeenCalled();
  });
});
