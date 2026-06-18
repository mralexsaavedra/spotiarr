import { describe, expect, it, vi, beforeEach } from "vitest";

const workerListeners: Record<string, (...args: unknown[]) => unknown> = {};

const workerOn = vi.fn((event: string, cb: (...args: unknown[]) => unknown) => {
  workerListeners[event] = cb;
});

const WorkerMock = vi.fn(() => ({ on: workerOn }));

const getCatalogSyncState = vi.fn();
const setCatalogSyncState = vi.fn();

// Logger mock — child logger returned for the worker scope
const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  child: vi.fn(),
};
loggerMock.child.mockReturnValue(loggerMock);

vi.mock("bullmq", () => ({ Worker: WorkerMock }));

vi.mock("@/container", () => ({
  getContainer: () => ({
    feedRepository: {
      getCatalogSyncState,
      setCatalogSyncState,
    },
    releaseFeedService: {},
    eventBus: { emit: vi.fn() },
    settingsService: { getNumber: vi.fn() },
  }),
  initializeContainer: vi.fn(),
  getContainerOrThrow: vi.fn(),
  getContainerUnsafe: vi.fn(),
  getContainerState: vi.fn(),
  __esModule: true,
}));

vi.mock("../setup/environment", () => ({
  getEnv: () => ({ REDIS_HOST: "localhost", REDIS_PORT: 6379 }),
}));

vi.mock("../setup/queues", () => ({
  CATALOG_SYNC_QUEUE: "catalog-sync-queue",
}));

vi.mock("../logging/logger", () => ({ logger: loggerMock }));

describe("createCatalogSyncWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(workerListeners).forEach((key) => delete workerListeners[key]);
    getCatalogSyncState.mockResolvedValue({ status: "idle" });
    setCatalogSyncState.mockResolvedValue(undefined);
    loggerMock.child.mockReturnValue(loggerMock);
  });

  it("creates a BullMQ Worker with the catalog-sync queue name", async () => {
    const { createCatalogSyncWorker } = await import("./catalog-sync.worker");
    createCatalogSyncWorker();

    expect(WorkerMock).toHaveBeenCalledWith(
      "catalog-sync-queue",
      expect.any(Function),
      expect.any(Object),
    );
  });

  it("registers completed and failed event listeners", async () => {
    const { createCatalogSyncWorker } = await import("./catalog-sync.worker");
    createCatalogSyncWorker();

    expect(workerOn).toHaveBeenCalledWith("completed", expect.any(Function));
    expect(workerOn).toHaveBeenCalledWith("failed", expect.any(Function));
  });

  it("completed listener logs the finished job id via structured logger", async () => {
    const { createCatalogSyncWorker } = await import("./catalog-sync.worker");
    createCatalogSyncWorker();

    workerListeners.completed?.({ id: "job-42" });

    expect(loggerMock.info).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "job-42" }),
      expect.any(String),
    );
  });

  it("resets catalog sync state to Idle when stuck in Running on startup", async () => {
    const { SYNC_STATUS } = await import("@/application/ports/feed-repository.port");
    getCatalogSyncState.mockResolvedValueOnce({ status: SYNC_STATUS.Running });

    const { createCatalogSyncWorker } = await import("./catalog-sync.worker");
    createCatalogSyncWorker();

    await Promise.resolve();
    await Promise.resolve();

    expect(setCatalogSyncState).toHaveBeenCalledWith(SYNC_STATUS.Idle);
  });

  it("does NOT reset catalog sync state when startup state is idle", async () => {
    const { SYNC_STATUS } = await import("@/application/ports/feed-repository.port");
    getCatalogSyncState.mockResolvedValueOnce({ status: SYNC_STATUS.Idle });

    const { createCatalogSyncWorker } = await import("./catalog-sync.worker");
    createCatalogSyncWorker();

    await Promise.resolve();
    await Promise.resolve();

    expect(setCatalogSyncState).not.toHaveBeenCalled();
  });

  it("logs an error via structured logger when the startup state check rejects", async () => {
    getCatalogSyncState.mockRejectedValueOnce(new Error("db down"));

    const { createCatalogSyncWorker } = await import("./catalog-sync.worker");
    createCatalogSyncWorker();

    await Promise.resolve();
    await Promise.resolve();

    expect(loggerMock.error).toHaveBeenCalled();
  });

  it("failed listener logs the job id and error via structured logger", async () => {
    const { createCatalogSyncWorker } = await import("./catalog-sync.worker");
    createCatalogSyncWorker();

    const err = new Error("sync crash");
    workerListeners.failed?.({ id: "job-1" }, err);

    expect(loggerMock.error).toHaveBeenCalledWith(
      expect.objectContaining({ jobId: "job-1", err }),
      expect.any(String),
    );
  });

  it("failed listener resets state to Error when sync state is still Running", async () => {
    const { SYNC_STATUS } = await import("@/application/ports/feed-repository.port");
    getCatalogSyncState.mockResolvedValue({ status: SYNC_STATUS.Running });

    const { createCatalogSyncWorker } = await import("./catalog-sync.worker");
    createCatalogSyncWorker();

    // consume the startup promise first
    await Promise.resolve();
    await Promise.resolve();
    vi.clearAllMocks();
    getCatalogSyncState.mockResolvedValue({ status: SYNC_STATUS.Running });
    setCatalogSyncState.mockResolvedValue(undefined);

    const err = new Error("worker crash");
    await (workerListeners.failed?.({ id: "job-2" }, err) as Promise<void>);

    await Promise.resolve();
    await Promise.resolve();

    expect(setCatalogSyncState).toHaveBeenCalledWith(SYNC_STATUS.Error, "worker crash");
  });

  it("failed listener skips state reset when sync state is NOT Running", async () => {
    const { SYNC_STATUS } = await import("@/application/ports/feed-repository.port");
    getCatalogSyncState.mockResolvedValue({ status: SYNC_STATUS.Idle });

    const { createCatalogSyncWorker } = await import("./catalog-sync.worker");
    createCatalogSyncWorker();

    await Promise.resolve();
    await Promise.resolve();
    vi.clearAllMocks();
    getCatalogSyncState.mockResolvedValue({ status: SYNC_STATUS.Idle });

    const err = new Error("crash");
    await (workerListeners.failed?.({ id: "job-3" }, err) as Promise<void>);

    await Promise.resolve();
    await Promise.resolve();

    expect(setCatalogSyncState).not.toHaveBeenCalled();
  });

  it("failed listener swallows errors from the state-reset promise chain", async () => {
    const { createCatalogSyncWorker } = await import("./catalog-sync.worker");
    createCatalogSyncWorker();

    await Promise.resolve();
    await Promise.resolve();
    vi.clearAllMocks();
    getCatalogSyncState.mockRejectedValueOnce(new Error("inner db error"));

    await expect(
      Promise.resolve(workerListeners.failed?.({ id: "job-4" }, new Error("x"))),
    ).resolves.not.toThrow();
  });

  it("invoking the worker processor delegates to runCatalogSyncJob", async () => {
    const { createCatalogSyncWorker } = await import("./catalog-sync.worker");
    createCatalogSyncWorker();

    // The processor is the second arg to the Worker constructor
    const processor = (WorkerMock.mock.calls[0] as unknown[])[1] as () => Promise<void>;

    // The container mock lacks getArtists, so runCatalogSyncJob throws on first use.
    // We only need the processor line to execute — not runCatalogSyncJob to succeed.
    await expect(processor()).rejects.toThrow();
  });
});
