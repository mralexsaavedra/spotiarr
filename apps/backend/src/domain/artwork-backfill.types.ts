export const ARTWORK_BACKFILL_STATUS = {
  Idle: "idle",
  Running: "running",
  PauseRequested: "pause_requested",
  Paused: "paused",
  PausedRateLimited: "paused_rate_limited",
  Completed: "completed",
  Error: "error",
} as const;

export type ArtworkBackfillStatus =
  (typeof ARTWORK_BACKFILL_STATUS)[keyof typeof ARTWORK_BACKFILL_STATUS];

export type ArtworkBackfillPhase = "artists" | "albums";

export type ArtworkBackfillCursorKind = "artist" | "album";

export interface ArtworkBackfillRun {
  id: string;
  status: ArtworkBackfillStatus;
  phase: ArtworkBackfillPhase;
  cursorKind: ArtworkBackfillCursorKind;
  cursorValue: string | null;
  totalCandidates: number;
  processed: number;
  skippedExisting: number;
  written: number;
  failed: number;
  externalCalls: number;
  rateLimitUntil: Date | null;
  error: string | null;
  createdAt: Date;
  updatedAt: Date;
}
