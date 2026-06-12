import type { ArtworkBackfillRunStatus } from "@spotiarr/shared";

export const ACTIVE_BACKFILL_STATUSES = new Set<ArtworkBackfillRunStatus>([
  "running",
  "pause_requested",
  "paused",
  "paused_rate_limited",
]);
