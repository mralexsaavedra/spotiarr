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

  describe("getCatalogSyncState", () => {
    it("calls upsert with Catalog id (2)", async () => {
      const upsert = vi.fn().mockResolvedValue({ id: 2, status: SYNC_STATUS.Idle });
      const prisma = { syncState: { upsert } } as any;
      const repo = new FeedSyncStateRepository(prisma);
      await repo.getCatalogSyncState();
      expect(upsert).toHaveBeenCalledOnce();
      const call = upsert.mock.calls[0][0];
      expect(call.where.id).toBe(2);
      expect(call.create.id).toBe(2);
    });
  });

  describe("setCatalogSyncState", () => {
    it("calls upsert with Catalog id (2)", async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const prisma = { syncState: { upsert } } as any;
      const repo = new FeedSyncStateRepository(prisma);
      await repo.setCatalogSyncState(SYNC_STATUS.Completed);
      expect(upsert).toHaveBeenCalledOnce();
      const call = upsert.mock.calls[0][0];
      expect(call.where.id).toBe(2);
    });

    it("sets error to null when no error argument provided", async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const prisma = { syncState: { upsert } } as any;
      const repo = new FeedSyncStateRepository(prisma);
      await repo.setCatalogSyncState(SYNC_STATUS.Completed);
      const call = upsert.mock.calls[0][0];
      expect(call.update.error).toBeNull();
      expect(call.create.error).toBeNull();
    });

    it("passes error string when provided", async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const prisma = { syncState: { upsert } } as any;
      const repo = new FeedSyncStateRepository(prisma);
      await repo.setCatalogSyncState(SYNC_STATUS.Error, "catalog error");
      const call = upsert.mock.calls[0][0];
      expect(call.update.error).toBe("catalog error");
    });
  });

  describe("setSyncState — Running branch", () => {
    it("sets lastSyncAt to undefined in update and null in create for Running status", async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const prisma = { syncState: { upsert } } as any;
      const repo = new FeedSyncStateRepository(prisma);
      await repo.setSyncState(SYNC_STATUS.Running);
      const call = upsert.mock.calls[0][0];
      expect(call.update.lastSyncAt).toBeUndefined();
      expect(call.create.lastSyncAt).toBeNull();
    });
  });

  describe("setSyncState — non-Running branch", () => {
    it("sets lastSyncAt to a Date in both update and create for Completed status", async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const prisma = { syncState: { upsert } } as any;
      const repo = new FeedSyncStateRepository(prisma);
      const before = Date.now();
      await repo.setSyncState(SYNC_STATUS.Completed);
      const after = Date.now();
      const call = upsert.mock.calls[0][0];
      expect(call.update.lastSyncAt).toBeInstanceOf(Date);
      expect(call.create.lastSyncAt).toBeInstanceOf(Date);
      expect(call.update.lastSyncAt.getTime()).toBeGreaterThanOrEqual(before);
      expect(call.update.lastSyncAt.getTime()).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe("setCatalogSyncState — Running branch", () => {
    it("sets lastSyncAt to undefined in update and null in create for Running status", async () => {
      const upsert = vi.fn().mockResolvedValue(undefined);
      const prisma = { syncState: { upsert } } as any;
      const repo = new FeedSyncStateRepository(prisma);
      await repo.setCatalogSyncState(SYNC_STATUS.Running);
      const call = upsert.mock.calls[0][0];
      expect(call.update.lastSyncAt).toBeUndefined();
      expect(call.create.lastSyncAt).toBeNull();
    });
  });
});
