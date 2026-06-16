import { describe, expect, it, vi } from "vitest";
import type { ArtworkBackfillRepositoryPort } from "@/application/ports/artwork-backfill-repository.port";
import { ARTWORK_BACKFILL_STATUS, type ArtworkBackfillRun } from "@/domain/artwork-backfill.types";
import { AppError } from "@/domain/errors/app-error";
import { PauseArtworkBackfillUseCase } from "./pause-artwork-backfill.use-case";

const makeActiveRun = (overrides: Partial<ArtworkBackfillRun> = {}): ArtworkBackfillRun => ({
  id: "run-1",
  status: "running",
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
  return { backfillRepository };
};

const makeUseCase = (
  backfillRepository: Pick<ArtworkBackfillRepositoryPort, "getActiveRun" | "updateStatus">,
) =>
  new PauseArtworkBackfillUseCase(
    backfillRepository as unknown as ArtworkBackfillRepositoryPort,
  );

describe("PauseArtworkBackfillUseCase", () => {
  it("throws AppError 404 when no active run exists", async () => {
    const { backfillRepository } = makeDeps();
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(null);

    const useCase = makeUseCase(backfillRepository);

    await expect(useCase.execute()).rejects.toThrow(AppError);
    await expect(useCase.execute()).rejects.toMatchObject({
      statusCode: 404,
      errorCode: "invalid_request",
    });
  });

  it("does not call updateStatus when no active run exists", async () => {
    const { backfillRepository } = makeDeps();
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(null);

    const useCase = makeUseCase(backfillRepository);
    await expect(useCase.execute()).rejects.toThrow();

    expect(backfillRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("returns paused immediately when run is already paused", async () => {
    const { backfillRepository } = makeDeps();
    const run = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.Paused });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);

    const useCase = makeUseCase(backfillRepository);
    const result = await useCase.execute();

    expect(result).toEqual({ runId: "run-1", status: "paused" });
    expect(backfillRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("requests pause when run is running", async () => {
    const { backfillRepository } = makeDeps();
    const run = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.Running });
    const updatedRun = makeActiveRun({ id: "run-1", status: ARTWORK_BACKFILL_STATUS.PauseRequested });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);
    vi.mocked(backfillRepository.updateStatus).mockResolvedValue(updatedRun);

    const useCase = makeUseCase(backfillRepository);
    const result = await useCase.execute();

    expect(backfillRepository.updateStatus).toHaveBeenCalledWith({
      runId: "run-1",
      status: ARTWORK_BACKFILL_STATUS.PauseRequested,
    });
    expect(result).toEqual({ runId: "run-1", status: "pause_requested" });
  });

  it("requests pause when run is in pause_requested state", async () => {
    const { backfillRepository } = makeDeps();
    const run = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.PauseRequested });
    const updatedRun = makeActiveRun({ id: "run-1", status: ARTWORK_BACKFILL_STATUS.PauseRequested });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);
    vi.mocked(backfillRepository.updateStatus).mockResolvedValue(updatedRun);

    const useCase = makeUseCase(backfillRepository);
    const result = await useCase.execute();

    expect(result).toEqual({ runId: "run-1", status: "pause_requested" });
  });

  it("uses the updated run id in the response", async () => {
    const { backfillRepository } = makeDeps();
    const run = makeActiveRun({ id: "run-original", status: ARTWORK_BACKFILL_STATUS.Running });
    const updatedRun = makeActiveRun({ id: "run-original", status: ARTWORK_BACKFILL_STATUS.PauseRequested });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);
    vi.mocked(backfillRepository.updateStatus).mockResolvedValue(updatedRun);

    const useCase = makeUseCase(backfillRepository);
    const result = await useCase.execute();

    expect(result.runId).toBe("run-original");
  });

  it("propagates repository getActiveRun errors", async () => {
    const { backfillRepository } = makeDeps();
    vi.mocked(backfillRepository.getActiveRun).mockRejectedValue(new Error("db error"));

    const useCase = makeUseCase(backfillRepository);

    await expect(useCase.execute()).rejects.toThrow("db error");
  });

  it("propagates repository updateStatus errors", async () => {
    const { backfillRepository } = makeDeps();
    const run = makeActiveRun({ status: ARTWORK_BACKFILL_STATUS.Running });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);
    vi.mocked(backfillRepository.updateStatus).mockRejectedValue(new Error("update failed"));

    const useCase = makeUseCase(backfillRepository);

    await expect(useCase.execute()).rejects.toThrow("update failed");
  });
});
