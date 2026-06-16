import { describe, expect, it, vi } from "vitest";
import type { ArtworkBackfillQueuePort } from "@/application/ports/artwork-backfill-queue.port";
import type { ArtworkBackfillRepositoryPort } from "@/application/ports/artwork-backfill-repository.port";
import { ARTWORK_BACKFILL_STATUS, type ArtworkBackfillRun } from "@/domain/artwork-backfill.types";
import { AppError } from "@/domain/errors/app-error";
import { ResumeArtworkBackfillUseCase } from "./resume-artwork-backfill.use-case";

const makeActiveRun = (overrides: Partial<ArtworkBackfillRun> = {}): ArtworkBackfillRun => ({
  id: "run-1",
  status: "paused",
  phase: "artists",
  cursorKind: "artist",
  cursorValue: null,
  totalCandidates: 100,
  processed: 10,
  skippedExisting: 0,
  written: 10,
  failed: 0,
  externalCalls: 5,
  rateLimitUntil: null,
  error: null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T01:00:00.000Z"),
  ...overrides,
});

const makeDeps = () => {
  const backfillRepository: Pick<ArtworkBackfillRepositoryPort, "getActiveRun" | "updateStatus"> = {
    getActiveRun: vi.fn(),
    updateStatus: vi.fn(),
  };
  const queuePort: ArtworkBackfillQueuePort = {
    enqueueRun: vi.fn(),
  };
  return { backfillRepository, queuePort };
};

const makeUseCase = (
  backfillRepository: Pick<ArtworkBackfillRepositoryPort, "getActiveRun" | "updateStatus">,
  queuePort: ArtworkBackfillQueuePort,
) =>
  new ResumeArtworkBackfillUseCase(
    backfillRepository as unknown as ArtworkBackfillRepositoryPort,
    queuePort,
  );

describe("ResumeArtworkBackfillUseCase", () => {
  it("throws AppError 404 when no active run exists", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(null);

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toThrow(AppError);
    await expect(useCase.execute()).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "invalid_request",
    });
  });

  it("throws AppError 409 when run is running (not paused)", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const run = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.Running });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toThrow(AppError);
    await expect(useCase.execute()).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "invalid_request",
    });
  });

  it("throws AppError 409 when run is in pause_requested state", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const run = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.PauseRequested });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toMatchObject({ statusCode: 409 });
  });

  it("resumes a paused run, updates to running, enqueues, returns running", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const run = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.Paused });
    const updatedRun = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.Running });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);
    vi.mocked(backfillRepository.updateStatus).mockResolvedValue(updatedRun);
    vi.mocked(queuePort.enqueueRun).mockResolvedValue(undefined);

    const useCase = makeUseCase(backfillRepository, queuePort);
    const result = await useCase.execute();

    expect(backfillRepository.updateStatus).toHaveBeenCalledWith({
      runId: "run-1",
      status: ARTWORK_BACKFILL_STATUS.Running,
      rateLimitUntil: null,
      error: null,
    });
    expect(queuePort.enqueueRun).toHaveBeenCalledWith(updatedRun.id);
    expect(result).toEqual({ runId: updatedRun.id, status: "running" });
  });

  it("resumes a paused_rate_limited run", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const run = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.PausedRateLimited });
    const updatedRun = makeActiveRun({ id: "run-1", status: ARTWORK_BACKFILL_STATUS.Running });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);
    vi.mocked(backfillRepository.updateStatus).mockResolvedValue(updatedRun);
    vi.mocked(queuePort.enqueueRun).mockResolvedValue(undefined);

    const useCase = makeUseCase(backfillRepository, queuePort);
    const result = await useCase.execute();

    expect(backfillRepository.updateStatus).toHaveBeenCalledWith({
      runId: "run-1",
      status: ARTWORK_BACKFILL_STATUS.Running,
      rateLimitUntil: null,
      error: null,
    });
    expect(result).toEqual({ runId: "run-1", status: "running" });
  });

  it("does not enqueue when no active run exists", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(null);

    const useCase = makeUseCase(backfillRepository, queuePort);
    await expect(useCase.execute()).rejects.toThrow();

    expect(queuePort.enqueueRun).not.toHaveBeenCalled();
  });

  it("does not enqueue when run is not paused", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const run = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.Running });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);

    const useCase = makeUseCase(backfillRepository, queuePort);
    await expect(useCase.execute()).rejects.toThrow();

    expect(queuePort.enqueueRun).not.toHaveBeenCalled();
  });

  it("propagates repository getActiveRun errors", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    vi.mocked(backfillRepository.getActiveRun).mockRejectedValue(new Error("db error"));

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toThrow("db error");
  });

  it("propagates repository updateStatus errors without enqueuing", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const run = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.Paused });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);
    vi.mocked(backfillRepository.updateStatus).mockRejectedValue(new Error("update failed"));

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toThrow("update failed");
    expect(queuePort.enqueueRun).not.toHaveBeenCalled();
  });

  it("propagates queue enqueueRun errors", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const run = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.Paused });
    const updatedRun = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.Running });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);
    vi.mocked(backfillRepository.updateStatus).mockResolvedValue(updatedRun);
    vi.mocked(queuePort.enqueueRun).mockRejectedValue(new Error("queue error"));

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toThrow("queue error");
  });
});
