import type { ArtworkBackfillRepositoryPort } from "@/application/ports/artwork-backfill-repository.port";

export class GetArtworkBackfillStatusUseCase {
  constructor(private readonly backfillRepository: ArtworkBackfillRepositoryPort) {}

  async execute(): Promise<{
    runId: string | null;
    status: string;
    phase: string | null;
    totals: number;
    processed: number;
    skippedExisting: number;
    written: number;
    failed: number;
    externalCalls: number;
    lastCheckpoint: string | null;
    rateLimitUntil: string | null;
    updatedAt: string | null;
  }> {
    const run = await this.backfillRepository.getActiveRun();

    if (!run) {
      return {
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
      };
    }

    return {
      runId: run.id,
      status: run.status,
      phase: run.phase,
      totals: run.totalCandidates,
      processed: run.processed,
      skippedExisting: run.skippedExisting,
      written: run.written,
      failed: run.failed,
      externalCalls: run.externalCalls,
      lastCheckpoint: run.cursorValue,
      rateLimitUntil: run.rateLimitUntil?.toISOString() ?? null,
      updatedAt: run.updatedAt.toISOString(),
    };
  }
}
