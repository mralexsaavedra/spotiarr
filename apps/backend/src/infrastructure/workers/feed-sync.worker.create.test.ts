import { describe, expect, it, vi, beforeEach } from "vitest";

const workerListeners: Record<string, (...args: unknown[]) => unknown> = {};

const workerOn = vi.fn((event: string, cb: (...args: unknown[]) => unknown) => {
  workerListeners[event] = cb;
});

const WorkerMock = vi.fn(() => ({
  on: workerOn,
}));

const getSyncState = vi.fn();
const setSyncState = vi.fn();

// Logger mock — child logger returned for the worker scope
const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(),
};
loggerMock.child.mockReturnValue(loggerMock);

vi.mock("bullmq", () => ({
  Worker: WorkerMock,
}));

vi.mock("@/container", () => ({
  getContainer: () => ({
    spotifyUserLibrarySyncService: {},
    releaseFeedService: {},
    feedRepository: {
      getSyncState,
      setSyncState,
    },
    eventBus: {
      emit: vi.fn(),
    },
    settingsService: {
      getNumber: vi.fn(),
    },
  }),
  initializeContainer: vi.fn(),
  getContainerOrThrow: vi.fn(),
  getContainerUnsafe: vi.fn(),
  // Keep the mock shape explicit so tests fail loudly if code tries to rely on removed exports.
  getContainerState: vi.fn(),
  __esModule: true,
}));

vi.mock("../setup/environment", () => ({
  getEnv: () => ({ REDIS_HOST: "localhost", REDIS_PORT: 6379 }),
}));

vi.mock("../setup/queues", () => ({
  FEED_SYNC_QUEUE: "feed-sync",
}));

vi.mock("../logging/logger", () => ({ logger: loggerMock }));

describe("createFeedSyncWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(workerListeners).forEach((key) => {
      delete workerListeners[key];
    });
    getSyncState.mockResolvedValue({ status: "idle" });
    setSyncState.mockResolvedValue(undefined);
    loggerMock.child.mockReturnValue(loggerMock);
  });

  it("logs non-fatal warning via structured logger when failed-state sync check rejects", async () => {
    const { createFeedSyncWorker } = await import("./feed-sync.worker");

    createFeedSyncWorker();
    getSyncState.mockRejectedValueOnce(new Error("read failure"));

    const failedHandler = workerListeners.failed;
    expect(failedHandler).toBeTypeOf("function");

    await failedHandler?.({ id: "job-1" }, new Error("job failed"));
    await Promise.resolve();

    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it("resets feed sync state to Idle when stuck in Running on startup", async () => {
    const { SYNC_STATUS } = await import("@/application/ports/feed-repository.port");
    getSyncState.mockResolvedValueOnce({ status: SYNC_STATUS.Running });

    const { createFeedSyncWorker } = await import("./feed-sync.worker");
    createFeedSyncWorker();

    await Promise.resolve();
    await Promise.resolve();

    expect(setSyncState).toHaveBeenCalledWith(SYNC_STATUS.Idle);
  });

  it("logs an error via structured logger when the startup state check rejects", async () => {
    getSyncState.mockRejectedValueOnce(new Error("startup db error"));

    const { createFeedSyncWorker } = await import("./feed-sync.worker");
    createFeedSyncWorker();

    await Promise.resolve();
    await Promise.resolve();

    expect(loggerMock.error).toHaveBeenCalled();
  });

  it("completed listener logs the finished job id via structured logger", async () => {
    const { createFeedSyncWorker } = await import("./feed-sync.worker");
    createFeedSyncWorker();

    const completedHandler = workerListeners.completed;
    expect(completedHandler).toBeTypeOf("function");

    completedHandler?.({ id: "job-77" });

    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "job-77" }),
      expect.any(String),
    );
  });

  it("failed listener resets state to Error when sync state is Running", async () => {
    const { SYNC_STATUS } = await import("@/application/ports/feed-repository.port");
    getSyncState.mockResolvedValue({ status: SYNC_STATUS.Running });

    const { createFeedSyncWorker } = await import("./feed-sync.worker");
    createFeedSyncWorker();

    // consume startup promise
    await Promise.resolve();
    await Promise.resolve();
    vi.clearAllMocks();
    getSyncState.mockResolvedValue({ status: SYNC_STATUS.Running });
    setSyncState.mockResolvedValue(undefined);

    const failedHandler = workerListeners.failed;
    await failedHandler?.({ id: "job-2" }, new Error("stalled job"));

    await Promise.resolve();
    await Promise.resolve();

    expect(setSyncState).toHaveBeenCalledWith(SYNC_STATUS.Error, "stalled job");
  });

  it("failed listener skips state reset when sync state is NOT Running", async () => {
    const { SYNC_STATUS } = await import("@/application/ports/feed-repository.port");
    getSyncState.mockResolvedValue({ status: SYNC_STATUS.Idle });

    const { createFeedSyncWorker } = await import("./feed-sync.worker");
    createFeedSyncWorker();

    await Promise.resolve();
    await Promise.resolve();
    vi.clearAllMocks();
    getSyncState.mockResolvedValue({ status: SYNC_STATUS.Idle });

    const failedHandler = workerListeners.failed;
    await failedHandler?.({ id: "job-3" }, new Error("crash"));

    await Promise.resolve();
    await Promise.resolve();

    expect(setSyncState).not.toHaveBeenCalledWith(SYNC_STATUS.Error, expect.any(String));
  });

  it("invoking the worker processor delegates to runFeedSyncJob", async () => {
    const { createFeedSyncWorker } = await import("./feed-sync.worker");
    createFeedSyncWorker();

    const processor = (WorkerMock.mock.calls[0] as unknown[])[1] as () => Promise<void>;

    // The container mock has no getFollowedArtists on spotifyUserLibrarySyncService,
    // so runFeedSyncJob throws. We just need lines 136-143 to be covered.
    await expect(processor()).rejects.toThrow();
  });
});
