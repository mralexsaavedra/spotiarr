import { describe, expect, it, vi } from "vitest";
import { SYNC_STATUS } from "@/application/ports/feed-repository.port";
import { FeedSyncStateRepository } from "./feed-sync-state.repository";

describe("FeedSyncStateRepository", () => {
  it("creates default sync state when missing", async () => {
    const prisma = {
      syncState: { upsert: vi.fn().mockResolvedValue({ id: 1, status: SYNC_STATUS.Idle }) },
    } as any;
    const repo = new FeedSyncStateRepository(prisma);
    await repo.getSyncState();
    expect(prisma.syncState.upsert).toHaveBeenCalledOnce();
  });

  it("sets sync state with optional error", async () => {
    const prisma = { syncState: { upsert: vi.fn().mockResolvedValue(undefined) } } as any;
    const repo = new FeedSyncStateRepository(prisma);
    await repo.setSyncState(SYNC_STATUS.Error, "boom");
    expect(prisma.syncState.upsert).toHaveBeenCalledOnce();
  });
});
