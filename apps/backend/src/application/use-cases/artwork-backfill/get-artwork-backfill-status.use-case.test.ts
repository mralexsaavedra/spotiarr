import { describe, expect, it, vi } from "vitest";
import type { ArtworkBackfillRepositoryPort } from "@/application/ports/artwork-backfill-repository.port";
import type { ArtworkBackfillRun } from "@/domain/artwork-backfill.types";
import { GetArtworkBackfillStatusUseCase } from "./get-artwork-backfill-status.use-case";

const makeActiveRun = (overrides: Partial<ArtworkBackfillRun> = {}): ArtworkBackfillRun => ({
  id: "run-1",
  status: "running",
  phase: "artists",
  cursorKind: "artist",
  cursorValue: "cursor-abc",
  totalCandidates: 100,
  processed: 20,
  skippedExisting: 5,
  written: 15,
  failed: 1,
  externalCalls: 10,
  rateLimitUntil: null,
  error: null,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T01:00:00.000Z"),
  ...overrides,
});

const makeDeps = () => {
  const backfillRepository: Pick<ArtworkBackfillRepositoryPort, "getActiveRun"> = {
    getActiveRun: vi.fn(),
  };
  return { backfillRepository };
};

const makeUseCase = (
  backfillRepository: Pick<ArtworkBackfillRepositoryPort, "getActiveRun">,
) =>
  new GetArtworkBackfillStatusUseCase(
    backfillRepository as unknown as ArtworkBackfillRepositoryPort,
  );

describe("GetArtworkBackfillStatusUseCase", () => {
  it("returns idle response when no active run exists", async () => {
    const { backfillRepository } = makeDeps();
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(null);

    const useCase = makeUseCase(backfillRepository);
    const result = await useCase.execute();

    expect(result).toEqual({
      runId: null,
      status: "idle",
      phase: null,
      totals: 0,
      processed: 0,
      skippedExisting: 0,
      written: 0,
      failed: 0,
      externalCalls: 0,
      lastCheckpoint: null,
      rateLimitUntil: null,
      updatedAt: null,
    });
  });

  it("maps active run fields to the response shape", async () => {
    const { backfillRepository } = makeDeps();
    const run = makeActiveRun();
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);

    const useCase = makeUseCase(backfillRepository);
    const result = await useCase.execute();

    expect(result).toEqual({
      runId: "run-1",
      status: "running",
      phase: "artists",
      totals: 100,
      processed: 20,
      skippedExisting: 5,
      written: 15,
      failed: 1,
      externalCalls: 10,
      lastCheckpoint: "cursor-abc",
      rateLimitUntil: null,
      updatedAt: "2024-01-01T01:00:00.000Z",
    });
  });

  it("serializes rateLimitUntil as ISO string when set", async () => {
    const { backfillRepository } = makeDeps();
    const rateLimitDate = new Date("2024-06-01T12:00:00.000Z");
    const run = makeActiveRun({ rateLimitUntil: rateLimitDate });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);

    const useCase = makeUseCase(backfillRepository);
    const result = await useCase.execute();

    expect(result.rateLimitUntil).toBe("2024-06-01T12:00:00.000Z");
  });

  it("maps cursorValue as lastCheckpoint including null", async () => {
    const { backfillRepository } = makeDeps();
    const run = makeActiveRun({ cursorValue: null });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);

    const useCase = makeUseCase(backfillRepository);
    const result = await useCase.execute();

    expect(result.lastCheckpoint).toBeNull();
  });

  it("maps paused status correctly", async () => {
    const { backfillRepository } = makeDeps();
    const run = makeActiveRun({ status: "paused" });
    vi.mocked(backfillRepository.getActiveRun).mockResolvedValue(run);

    const useCase = makeUseCase(backfillRepository);
    const result = await useCase.execute();

    expect(result.status).toBe("paused");
    expect(result.runId).toBe("run-1");
  });

  it("propagates repository errors", async () => {
    const { backfillRepository } = makeDeps();
    vi.mocked(backfillRepository.getActiveRun).mockRejectedValue(new Error("db error"));

    const useCase = makeUseCase(backfillRepository);

    await expect(useCase.execute()).rejects.toThrow("db error");
  });
});
