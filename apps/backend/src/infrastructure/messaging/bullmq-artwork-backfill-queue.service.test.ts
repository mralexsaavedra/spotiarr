import { describe, expect, it, vi, beforeEach } from "vitest";

const addMock = vi.fn();

vi.mock("../setup/queues", () => ({
  getArtworkBackfillQueue: () => ({ add: addMock }),
}));

describe("BullMqArtworkBackfillQueueService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enqueues a job named 'artwork-backfill-run' with the runId in the payload", async () => {
    const { BullMqArtworkBackfillQueueService } =
      await import("./bullmq-artwork-backfill-queue.service");
    const service = new BullMqArtworkBackfillQueueService();

    await service.enqueueRun("run-123");

    expect(addMock).toHaveBeenCalledOnce();
    expect(addMock).toHaveBeenCalledWith(
      "artwork-backfill-run",
      { runId: "run-123" },
      expect.objectContaining({ jobId: "artwork-backfill-active" }),
    );
  });

  it("uses a stable jobId 'artwork-backfill-active' to deduplicate concurrent runs", async () => {
    const { BullMqArtworkBackfillQueueService } =
      await import("./bullmq-artwork-backfill-queue.service");
    const service = new BullMqArtworkBackfillQueueService();

    await service.enqueueRun("run-abc");

    const [, , opts] = addMock.mock.calls[0];
    expect(opts.jobId).toBe("artwork-backfill-active");
  });

  it("sets removeOnComplete to true so finished jobs do not pile up", async () => {
    const { BullMqArtworkBackfillQueueService } =
      await import("./bullmq-artwork-backfill-queue.service");
    const service = new BullMqArtworkBackfillQueueService();

    await service.enqueueRun("run-xyz");

    const [, , opts] = addMock.mock.calls[0];
    expect(opts.removeOnComplete).toBe(true);
  });

  it("propagates queue errors to the caller", async () => {
    const { BullMqArtworkBackfillQueueService } =
      await import("./bullmq-artwork-backfill-queue.service");
    const service = new BullMqArtworkBackfillQueueService();
    addMock.mockRejectedValueOnce(new Error("redis unavailable"));

    await expect(service.enqueueRun("run-fail")).rejects.toThrow("redis unavailable");
  });
});
