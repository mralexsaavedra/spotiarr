import { describe, expect, it, vi } from "vitest";
import { ARTWORK_BACKFILL_STATUS, type ArtworkBackfillRun } from "@/domain/artwork-backfill.types";
import { GetArtworkBackfillStatusUseCase } from "./get-artwork-backfill-status.use-case";
import { PauseArtworkBackfillUseCase } from "./pause-artwork-backfill.use-case";
import { ResumeArtworkBackfillUseCase } from "./resume-artwork-backfill.use-case";
import { StartArtworkBackfillUseCase } from "./start-artwork-backfill.use-case";

const now = new Date("2026-05-29T10:00:00.000Z");

function makeRun(overrides: Partial<ArtworkBackfillRun> = {}): ArtworkBackfillRun {
  return {
    id: "run-1",
    status: ARTWORK_BACKFILL_STATUS.Running,
    phase: "artists",
    cursorKind: "artist",
    cursorValue: "artist:a1",
    totalCandidates: 10,
    processed: 2,
    skippedExisting: 1,
    written: 1,
    failed: 0,
    externalCalls: 0,
    rateLimitUntil: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("ArtworkBackfill lifecycle use-cases", () => {
  it("starts run and enqueues it", async () => {
    const repository = {
      getActiveRun: vi.fn().mockResolvedValue(null),
      createRun: vi.fn().mockResolvedValue(makeRun()),
    } as any;
    const queue = { enqueueRun: vi.fn().mockResolvedValue(undefined) };

    const result = await new StartArtworkBackfillUseCase(repository, queue).execute();

    expect(result).toEqual({ runId: "run-1", status: "running" });
    expect(queue.enqueueRun).toHaveBeenCalledWith("run-1");
  });

  it("does not create a new run when an active resumable run exists", async () => {
    const statuses = [
      ARTWORK_BACKFILL_STATUS.Running,
      ARTWORK_BACKFILL_STATUS.PauseRequested,
      ARTWORK_BACKFILL_STATUS.Paused,
      ARTWORK_BACKFILL_STATUS.PausedRateLimited,
    ] as const;

    for (const status of statuses) {
      const repository = {
        getActiveRun: vi.fn().mockResolvedValue(makeRun({ status })),
        createRun: vi.fn(),
      } as any;
      const queue = { enqueueRun: vi.fn() };

      await expect(
        new StartArtworkBackfillUseCase(repository, queue).execute(),
      ).rejects.toMatchObject({
        statusCode: 409,
      });

      expect(repository.createRun).not.toHaveBeenCalled();
      expect(queue.enqueueRun).not.toHaveBeenCalled();
    }
  });

  it("pauses active run and resumes paused_rate_limited run", async () => {
    const repository = {
      getActiveRun: vi
        .fn()
        .mockResolvedValueOnce(makeRun({ status: ARTWORK_BACKFILL_STATUS.Running }))
        .mockResolvedValueOnce(makeRun({ status: ARTWORK_BACKFILL_STATUS.PausedRateLimited })),
      updateStatus: vi
        .fn()
        .mockResolvedValueOnce(makeRun({ status: ARTWORK_BACKFILL_STATUS.PauseRequested }))
        .mockResolvedValueOnce(makeRun({ status: ARTWORK_BACKFILL_STATUS.Running })),
    } as any;
    const queue = { enqueueRun: vi.fn().mockResolvedValue(undefined) };

    const paused = await new PauseArtworkBackfillUseCase(repository).execute();
    expect(paused.status).toBe("pause_requested");

    const resumed = await new ResumeArtworkBackfillUseCase(repository, queue).execute();
    expect(resumed.status).toBe("running");
    expect(queue.enqueueRun).toHaveBeenCalledWith("run-1");
  });

  it("returns idle status when no active run and run metrics when present", async () => {
    const repository = {
      getActiveRun: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeRun({ processed: 5, externalCalls: 2 })),
    } as any;

    const useCase = new GetArtworkBackfillStatusUseCase(repository);
    const idle = await useCase.execute();
    const running = await useCase.execute();

    expect(idle.status).toBe("idle");
    expect(running).toMatchObject({ status: "running", processed: 5, externalCalls: 2 });
  });
});
