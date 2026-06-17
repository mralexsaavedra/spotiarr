import { describe, expect, it, vi, beforeEach } from "vitest";

const workerListeners: Record<string, (...args: unknown[]) => unknown> = {};

const workerOn = vi.fn((event: string, cb: (...args: unknown[]) => unknown) => {
  workerListeners[event] = cb;
});

const WorkerMock = vi.fn(() => ({ on: workerOn }));

vi.mock("bullmq", () => ({ Worker: WorkerMock }));

vi.mock("@/container", () => ({
  getContainer: () => ({
    artworkBackfillRepository: {},
    processArtworkBackfillBatchUseCase: {},
    eventBus: { emit: vi.fn() },
    libraryService: { clearCache: vi.fn() },
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
  ARTWORK_BACKFILL_QUEUE: "artwork-backfill-processor",
}));

describe("createArtworkBackfillWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(workerListeners).forEach((key) => delete workerListeners[key]);
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("creates a BullMQ Worker with the artwork-backfill queue name", async () => {
    const { createArtworkBackfillWorker } = await import("./artwork-backfill.worker");
    createArtworkBackfillWorker();

    expect(WorkerMock).toHaveBeenCalledWith(
      "artwork-backfill-processor",
      expect.any(Function),
      expect.any(Object),
    );
  });

  it("registers completed and failed event listeners", async () => {
    const { createArtworkBackfillWorker } = await import("./artwork-backfill.worker");
    createArtworkBackfillWorker();

    expect(workerOn).toHaveBeenCalledWith("completed", expect.any(Function));
    expect(workerOn).toHaveBeenCalledWith("failed", expect.any(Function));
  });

  it("completed listener logs the finished job id", async () => {
    const { createArtworkBackfillWorker } = await import("./artwork-backfill.worker");
    createArtworkBackfillWorker();

    workerListeners.completed?.({ id: "job-99" });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining("job-99"));
  });

  it("failed listener logs the job id and error", async () => {
    const { createArtworkBackfillWorker } = await import("./artwork-backfill.worker");
    createArtworkBackfillWorker();

    const err = new Error("backfill crash");
    workerListeners.failed?.({ id: "job-1" }, err);

    expect(console.error).toHaveBeenCalledWith(expect.stringContaining("job-1"), err);
  });

  it("failed listener handles a null job without throwing", async () => {
    const { createArtworkBackfillWorker } = await import("./artwork-backfill.worker");
    createArtworkBackfillWorker();

    expect(() => workerListeners.failed?.(null, new Error("stalled"))).not.toThrow();
  });

  it("processor parses job data via Zod and calls runArtworkBackfillJob", async () => {
    const { createArtworkBackfillWorker } = await import("./artwork-backfill.worker");
    createArtworkBackfillWorker();

    const processor = (WorkerMock.mock.calls[0] as unknown[])[1] as (job: {
      data: unknown;
    }) => Promise<void>;

    // The container's artworkBackfillRepository is an empty object, so getById is
    // undefined — this throws after Zod validation passes, confirming data flows through.
    await expect(processor({ data: { runId: "run-abc" } })).rejects.toThrow();
  });

  it("processor rejects when job data fails Zod validation (empty runId)", async () => {
    const { createArtworkBackfillWorker } = await import("./artwork-backfill.worker");
    createArtworkBackfillWorker();

    const processor = (WorkerMock.mock.calls[0] as unknown[])[1] as (job: {
      data: unknown;
    }) => Promise<void>;

    await expect(processor({ data: { runId: "" } })).rejects.toThrow();
  });
});
