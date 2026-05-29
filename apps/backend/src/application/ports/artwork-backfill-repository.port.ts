import type {
  ArtworkBackfillCursorKind,
  ArtworkBackfillPhase,
  ArtworkBackfillRun,
  ArtworkBackfillStatus,
} from "@/domain/artwork-backfill.types";

export interface ArtworkBackfillCheckpointUpdate {
  runId: string;
  phase: ArtworkBackfillPhase;
  cursorKind: ArtworkBackfillCursorKind;
  cursorValue: string | null;
  totalCandidates: number;
  processed: number;
  skippedExisting: number;
  written: number;
  failed: number;
  externalCalls: number;
}

export interface ArtworkBackfillRepositoryPort {
  createRun(): Promise<ArtworkBackfillRun>;
  getById(id: string): Promise<ArtworkBackfillRun | null>;
  getActiveRun(): Promise<ArtworkBackfillRun | null>;
  updateStatus(input: {
    runId: string;
    status: ArtworkBackfillStatus;
    error?: string | null;
    rateLimitUntil?: Date | null;
  }): Promise<ArtworkBackfillRun>;
  updateCheckpoint(input: ArtworkBackfillCheckpointUpdate): Promise<ArtworkBackfillRun>;
}
