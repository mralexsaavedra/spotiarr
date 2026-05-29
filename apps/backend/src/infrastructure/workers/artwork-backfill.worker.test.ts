import { describe, expect, it, vi } from "vitest";
import { ARTWORK_BACKFILL_STATUS, type ArtworkBackfillRun } from "@/domain/artwork-backfill.types";
import { AppError } from "@/domain/errors/app-error";
import { runArtworkBackfillJob } from "./artwork-backfill.worker";

function makeRun(overrides: Partial<ArtworkBackfillRun> = {}): ArtworkBackfillRun {
  return {
    id: "run-1",
    status: ARTWORK_BACKFILL_STATUS.Running,
    phase: "artists",
    cursorKind: "artist",
    cursorValue: null,
    totalCandidates: 0,
    processed: 0,
    skippedExisting: 0,
    written: 0,
    failed: 0,
    externalCalls: 0,
    rateLimitUntil: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("runArtworkBackfillJob", () => {
  it("pauses run when pause is requested", async () => {
    const backfillRepository = {
      getById: vi
        .fn()
        .mockResolvedValueOnce(makeRun())
        .mockResolvedValueOnce(makeRun({ status: ARTWORK_BACKFILL_STATUS.PauseRequested })),
      updateStatus: vi.fn().mockResolvedValue(makeRun({ status: ARTWORK_BACKFILL_STATUS.Paused })),
    } as any;
    const deps = {
      backfillRepository,
      processBatchUseCase: { execute: vi.fn() } as any,
      eventBus: { emit: vi.fn() } as any,
    };

    await runArtworkBackfillJob(deps, { runId: "run-1" });

    expect(backfillRepository.updateStatus).toHaveBeenCalledWith({
      runId: "run-1",
      status: ARTWORK_BACKFILL_STATUS.Paused,
    });
  });

  it("moves run to paused_rate_limited when spotify returns 429", async () => {
    const backfillRepository = {
      getById: vi.fn().mockResolvedValue(makeRun()),
      updateStatus: vi
        .fn()
        .mockResolvedValue(makeRun({ status: ARTWORK_BACKFILL_STATUS.PausedRateLimited })),
    } as any;
    const deps = {
      backfillRepository,
      processBatchUseCase: {
        execute: vi.fn().mockRejectedValue(new AppError(429, "spotify_rate_limited", "429")),
      } as any,
      eventBus: { emit: vi.fn() } as any,
    };

    await runArtworkBackfillJob(deps, { runId: "run-1" });

    expect(backfillRepository.updateStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: "run-1",
        status: ARTWORK_BACKFILL_STATUS.PausedRateLimited,
      }),
    );
  });

  it("disables external fallback after cutoff while continuing local/cache processing", async () => {
    const backfillRepository = {
      getById: vi
        .fn()
        .mockResolvedValueOnce(makeRun({ externalCalls: 149 }))
        .mockResolvedValueOnce(makeRun({ externalCalls: 149 }))
        .mockResolvedValueOnce(makeRun({ externalCalls: 150 }))
        .mockResolvedValueOnce(makeRun({ externalCalls: 150 }))
        .mockResolvedValueOnce(makeRun({ externalCalls: 150 }))
        .mockResolvedValueOnce(makeRun({ externalCalls: 150 })),
      updateStatus: vi
        .fn()
        .mockResolvedValue(makeRun({ status: ARTWORK_BACKFILL_STATUS.Completed })),
    } as any;
    const processBatchUseCase = {
      execute: vi
        .fn()
        .mockResolvedValueOnce({
          phase: "artists",
          processed: 1,
          skippedExisting: 0,
          written: 1,
          failed: 0,
          externalCalls: 1,
          cursorValue: "artist:1",
        })
        .mockResolvedValueOnce({
          phase: "artists",
          processed: 0,
          skippedExisting: 0,
          written: 0,
          failed: 0,
          externalCalls: 0,
          cursorValue: null,
        })
        .mockResolvedValueOnce({
          phase: "albums",
          processed: 1,
          skippedExisting: 1,
          written: 0,
          failed: 0,
          externalCalls: 0,
          cursorValue: "album:1",
        })
        .mockResolvedValueOnce({
          phase: "albums",
          processed: 0,
          skippedExisting: 0,
          written: 0,
          failed: 0,
          externalCalls: 0,
          cursorValue: null,
        }),
    } as any;

    const deps = {
      backfillRepository,
      processBatchUseCase,
      eventBus: { emit: vi.fn() } as any,
    };

    await runArtworkBackfillJob(deps, { runId: "run-1" });

    expect(processBatchUseCase.execute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ allowExternalFallback: true, phase: "artists" }),
    );
    expect(processBatchUseCase.execute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ allowExternalFallback: false, phase: "artists" }),
    );
    expect(processBatchUseCase.execute).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ allowExternalFallback: false, phase: "albums" }),
    );
  });

  it("uses cumulative external calls from repository to disable fallback", async () => {
    const backfillRepository = {
      getById: vi
        .fn()
        .mockResolvedValueOnce(makeRun({ externalCalls: 149 }))
        .mockResolvedValueOnce(makeRun({ externalCalls: 149 }))
        .mockResolvedValueOnce(makeRun({ externalCalls: 151 }))
        .mockResolvedValueOnce(makeRun({ externalCalls: 151 }))
        .mockResolvedValueOnce(makeRun({ externalCalls: 151 })),
      updateStatus: vi
        .fn()
        .mockResolvedValue(makeRun({ status: ARTWORK_BACKFILL_STATUS.Completed })),
    } as any;

    const processBatchUseCase = {
      execute: vi
        .fn()
        .mockResolvedValueOnce({
          phase: "artists",
          processed: 1,
          skippedExisting: 0,
          written: 0,
          failed: 0,
          externalCalls: 1,
          cursorValue: "artist:1",
        })
        .mockResolvedValueOnce({
          phase: "artists",
          processed: 0,
          skippedExisting: 0,
          written: 0,
          failed: 0,
          externalCalls: 0,
          cursorValue: null,
        })
        .mockResolvedValueOnce({
          phase: "albums",
          processed: 0,
          skippedExisting: 0,
          written: 0,
          failed: 0,
          externalCalls: 0,
          cursorValue: null,
        }),
    } as any;

    const deps = {
      backfillRepository,
      processBatchUseCase,
      eventBus: { emit: vi.fn() } as any,
    };

    await runArtworkBackfillJob(deps, { runId: "run-1" });

    expect(processBatchUseCase.execute).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ allowExternalFallback: true }),
    );
    expect(processBatchUseCase.execute).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ allowExternalFallback: false }),
    );
  });
});
