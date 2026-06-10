import type { AiPlaylistProgressEvent } from "@spotiarr/shared";
import { describe, it, expect, vi, beforeEach } from "vitest";

const workerListeners: Record<string, (...args: unknown[]) => unknown> = {};

const workerOn = vi.fn((event: string, cb: (...args: unknown[]) => unknown) => {
  workerListeners[event] = cb;
});

const WorkerMock = vi.fn(() => ({
  on: workerOn,
}));

const executeUseCase = vi.fn();
const emitEventBus = vi.fn();

vi.mock("bullmq", () => ({
  Worker: WorkerMock,
}));

vi.mock("@/container", () => ({
  getContainer: () => ({
    aiPlaylistQueueService: {},
    aiChatPort: {},
    settingsService: {},
    spotifyUrlLookupClient: { resolveTrackUrl: vi.fn() },
    playlistRepository: { save: vi.fn() },
    trackService: { create: vi.fn() },
    eventBus: { emit: emitEventBus, on: vi.fn() },
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
  AI_PLAYLIST_QUEUE: "ai-playlist-processor",
}));

vi.mock("@/application/use-cases/ai/generate-ai-playlist.use-case", () => ({
  GenerateAiPlaylistUseCase: vi.fn().mockImplementation(() => ({
    execute: executeUseCase,
  })),
}));

describe("createAiPlaylistWorker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(workerListeners).forEach((key) => {
      delete workerListeners[key];
    });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("creates a Worker with the AI_PLAYLIST_QUEUE and concurrency 1", async () => {
    const { createAiPlaylistWorker } = await import("./ai-playlist.worker");
    createAiPlaylistWorker();

    expect(WorkerMock).toHaveBeenCalledWith(
      "ai-playlist-processor",
      expect.any(Function),
      expect.objectContaining({ concurrency: 1 }),
    );
  });

  it("registers completed and failed handlers", async () => {
    const { createAiPlaylistWorker } = await import("./ai-playlist.worker");
    createAiPlaylistWorker();

    expect(workerOn).toHaveBeenCalledWith("completed", expect.any(Function));
    expect(workerOn).toHaveBeenCalledWith("failed", expect.any(Function));
  });

  it("processor delegates to GenerateAiPlaylistUseCase.execute with job data", async () => {
    const { createAiPlaylistWorker } = await import("./ai-playlist.worker");
    createAiPlaylistWorker();

    const processor = (WorkerMock.mock.calls[0] as unknown[])[1] as (job: unknown) => Promise<void>;
    const job = { data: { jobId: "job-123", prompt: "upbeat 90s rock" } };

    executeUseCase.mockResolvedValueOnce(undefined);
    await processor(job);

    expect(executeUseCase).toHaveBeenCalledWith({ jobId: "job-123", prompt: "upbeat 90s rock" });
  });

  it("onProgress emits ai-playlist-progress via eventBus", async () => {
    const { createAiPlaylistWorker } = await import("./ai-playlist.worker");
    createAiPlaylistWorker();

    const processor = (WorkerMock.mock.calls[0] as unknown[])[1] as (job: unknown) => Promise<void>;
    const job = { data: { jobId: "job-456", prompt: "jazz standards" } };

    let capturedOnProgress: ((event: AiPlaylistProgressEvent) => void) | undefined;
    const { GenerateAiPlaylistUseCase } =
      await import("@/application/use-cases/ai/generate-ai-playlist.use-case");
    vi.mocked(GenerateAiPlaylistUseCase).mockImplementationOnce((deps) => {
      capturedOnProgress = deps.onProgress;
      return { execute: executeUseCase } as unknown as InstanceType<
        typeof GenerateAiPlaylistUseCase
      >;
    });

    executeUseCase.mockResolvedValueOnce(undefined);
    await processor(job);

    const event: AiPlaylistProgressEvent = {
      jobId: "job-456",
      stage: "llm",
      progress: 0,
    };
    capturedOnProgress?.(event);

    expect(emitEventBus).toHaveBeenCalledWith("ai-playlist-progress", event);
  });

  it("failed handler logs the error", async () => {
    const { createAiPlaylistWorker } = await import("./ai-playlist.worker");
    createAiPlaylistWorker();

    const failedHandler = workerListeners.failed;
    expect(failedHandler).toBeTypeOf("function");

    failedHandler?.({ id: "job-1" }, new Error("job failed"));

    expect(console.error).toHaveBeenCalled();
  });
});
