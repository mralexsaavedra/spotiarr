import { describe, expect, it, vi, beforeEach } from "vitest";

const addMock = vi.fn();

vi.mock("../setup/queues", () => ({
  getAiPlaylistQueue: () => ({ add: addMock }),
}));

describe("BullMqAiPlaylistQueueService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues a generate job with the given jobId and prompt", async () => {
    const { BullMqAiPlaylistQueueService } = await import("./bullmq-ai-playlist-queue.service");
    const service = new BullMqAiPlaylistQueueService();

    await service.enqueueGenerate({ jobId: "job-abc", prompt: "chill vibes" });

    expect(addMock).toHaveBeenCalledOnce();
    expect(addMock).toHaveBeenCalledWith(
      "generate-ai-playlist",
      { jobId: "job-abc", prompt: "chill vibes" },
      { jobId: "job-abc", attempts: 1, removeOnComplete: true },
    );
  });

  it("propagates queue errors", async () => {
    const { BullMqAiPlaylistQueueService } = await import("./bullmq-ai-playlist-queue.service");
    const service = new BullMqAiPlaylistQueueService();
    addMock.mockRejectedValueOnce(new Error("redis down"));

    await expect(service.enqueueGenerate({ jobId: "job-1", prompt: "test" })).rejects.toThrow(
      "redis down",
    );
  });
});
