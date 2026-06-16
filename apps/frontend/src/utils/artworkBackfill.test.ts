import type { ArtworkBackfillRunStatus } from "@spotiarr/shared";
import { describe, expect, it } from "vitest";
import { ACTIVE_BACKFILL_STATUSES } from "./artworkBackfill";

describe("ACTIVE_BACKFILL_STATUSES", () => {
  it("is a Set", () => {
    expect(ACTIVE_BACKFILL_STATUSES).toBeInstanceOf(Set);
  });

  it("contains exactly 4 statuses", () => {
    expect(ACTIVE_BACKFILL_STATUSES.size).toBe(4);
  });

  const activeStatuses: ArtworkBackfillRunStatus[] = [
    "running",
    "pause_requested",
    "paused",
    "paused_rate_limited",
  ];

  it.each(activeStatuses)("includes '%s' as an active status", (status) => {
    expect(ACTIVE_BACKFILL_STATUSES.has(status)).toBe(true);
  });

  const inactiveStatuses: ArtworkBackfillRunStatus[] = ["idle", "completed", "error"];

  it.each(inactiveStatuses)("does NOT include '%s' as an active status", (status) => {
    expect(ACTIVE_BACKFILL_STATUSES.has(status)).toBe(false);
  });
});
