import { describe, expect, it, vi } from "vitest";
import type { ArtworkBackfillQueuePort } from "@/application/ports/artwork-backfill-queue.port";
import type { ArtworkBackfillRepositoryPort } from "@/application/ports/artwork-backfill-repository.port";
import { ARTWORK_BACKFILL_STATUS, type ArtworkBackfillRun } from "@/domain/artwork-backfill.types";
import { AppError } from "@/domain/errors/app-error";
import { StartArtworkBackfillUseCase } from "./start-artwork-backfill.use-case";

const makeRun = (overrides: Partial<ArtworkBackfillRun> = {}): ArtworkBackfillRun => ({
  id: "run-1",
  status: "running",
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
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  ...overrides,
});

const makeDeps = () => {
  const backfillRepository: Pick<ArtworkBackfillRepositoryPort, "getActiveRun" | "createRun"> = {
    getActiveRun: vi.fn(),
    createRun: vi.fn(),
  };
  const queuePort: ArtworkBackfillQueuePort = {
    enqueueRun: vi.fn(),
  };
  return { backfillRepository, queuePort };
};

const makeUseCase = (
  backfillRepository: Pick<ArtworkBackfillRepositoryPort, "getActiveRun" | "createRun">,
  queuePort: ArtworkBackfillQueuePort,
) =>
  new StartArtworkBackfillUseCase(
    backfillRepository as unknown as ArtworkBackfillRepositoryPort,
    queuePort,
  );

describe("StartArtworkBackfillUseCase", () => {
  it("creates a new run and enqueues it when no active run exists", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const newRun = makeRun({ id: "run-new" });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(null);
    vi.mocked(backfillRepository.createRun).mockResolvedValue(newRun);
    vi.mocked(queuePort.enqueueRun).mockResolvedValue(undefined);

    const useCase = makeUseCase(backfillRepository, queuePort);
    const result = await useCase.execute();

    expect(backfillRepository.createRun).toHaveBeenCalledOnce();
    expect(queuePort.enqueueRun).toHaveBeenCalledWith("run-new");
    expect(result).toEqual({ runId: "run-new", status: "running" });
  });

  it("throws AppError 409 when a running active run exists", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const activeRun = makeRun({ status: ARTWORK_BACKFILL_STATUS.Running });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(activeRun);

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toThrow(AppError);
    await expect(useCase.execute()).rejects.toMatchObject({
      statusCode: 409,
      errorCode: "invalid_request",
    });
  });

  it("throws AppError 409 when a pause_requested run exists", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const activeRun = makeRun({ status: ARTWORK_BACKFILL_STATUS.PauseRequested });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(activeRun);

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toMatchObject({ statusCode: 409 });
  });

  it("throws AppError 409 when a paused run exists", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const activeRun = makeRun({ status: ARTWORK_BACKFILL_STATUS.Paused });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(activeRun);

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toMatchObject({ statusCode: 409 });
  });

  it("throws AppError 409 when a paused_rate_limited run exists", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const activeRun = makeRun({ status: ARTWORK_BACKFILL_STATUS.PausedRateLimited });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(activeRun);

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toMatchObject({ statusCode: 409 });
  });

  it("does not create or enqueue when an active blocking run exists", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const activeRun = makeRun({ status: ARTWORK_BACKFILL_STATUS.Running });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(activeRun);

    const useCase = makeUseCase(backfillRepository, queuePort);
    await expect(useCase.execute()).rejects.toThrow();

    expect(backfillRepository.createRun).not.toHaveBeenCalled();
    expect(queuePort.enqueueRun).not.toHaveBeenCalled();
  });

  it("allows starting when active run has a completed status", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const completedRun = makeRun({ id: "old-run", status: ARTWORK_BACKFILL_STATUS.Completed });
    const newRun = makeRun({ id: "new-run" });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(completedRun);
    vi.mocked(backfillRepository.createRun).mockResolvedValue(newRun);
    vi.mocked(queuePort.enqueueRun).mockResolvedValue(undefined);

    const useCase = makeUseCase(backfillRepository, queuePort);
    const result = await useCase.execute();

    expect(backfillRepository.createRun).toHaveBeenCalledOnce();
    expect(result).toEqual({ runId: "new-run", status: "running" });
  });

  it("allows starting when active run has an error status", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const errorRun = makeRun({ id: "old-run", status: ARTWORK_BACKFILL_STATUS.Error });
    const newRun = makeRun({ id: "new-run" });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(errorRun);
    vi.mocked(backfillRepository.createRun).mockResolvedValue(newRun);
    vi.mocked(queuePort.enqueueRun).mockResolvedValue(undefined);

    const useCase = makeUseCase(backfillRepository, queuePort);
    const result = await useCase.execute();

    expect(backfillRepository.createRun).toHaveBeenCalledOnce();
    expect(result).toEqual({ runId: "new-run", status: "running" });
  });

  it("propagates repository getActiveRun errors", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    vi.mocked(backfillRepository.getActiveRun).mockRejectedValue(new Error("db error"));

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toThrow("db error");
  });

  it("propagates repository createRun errors without enqueuing", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(null);
    vi.mocked(backfillRepository.createRun).mockRejectedValue(new Error("create failed"));

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toThrow("create failed");
    expect(queuePort.enqueueRun).not.toHaveBeenCalled();
  });

  it("propagates queue enqueueRun errors", async () => {
    const { backfillRepository, queuePort } = makeDeps();
    const newRun = makeRun({ id: "run-new" });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(null);
    vi.mocked(backfillRepository.createRun).mockResolvedValue(newRun);
    vi.mocked(queuePort.enqueueRun).mockRejectedValue(new Error("queue error"));

    const useCase = makeUseCase(backfillRepository, queuePort);

    await expect(useCase.execute()).rejects.toThrow("queue error");
  });
});
