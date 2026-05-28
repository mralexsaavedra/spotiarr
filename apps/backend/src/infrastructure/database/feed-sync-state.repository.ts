import type { PrismaClient } from "@prisma/client";
import {
  SYNC_STATUS,
  type SyncStateRecord,
  type SyncStatus,
} from "@/application/ports/feed-repository.port";

const SyncStateId = { Feed: 1, Catalog: 2 } as const;

export class FeedSyncStateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getSyncState(): Promise<SyncStateRecord> {
    return this.prisma.syncState.upsert({
      where: { id: SyncStateId.Feed },
      update: {},
      create: { id: SyncStateId.Feed, status: SYNC_STATUS.Idle },
    });
  }

  async setSyncState(status: SyncStatus, error?: string): Promise<void> {
    await this.prisma.syncState.upsert({
      where: { id: SyncStateId.Feed },
      update: {
        status,
        error: error ?? null,
        lastSyncAt: status === SYNC_STATUS.Running ? undefined : new Date(),
      },
      create: {
        id: SyncStateId.Feed,
        status,
        error: error ?? null,
        lastSyncAt: status === SYNC_STATUS.Running ? null : new Date(),
      },
    });
  }

  async getCatalogSyncState(): Promise<SyncStateRecord> {
    return this.prisma.syncState.upsert({
      where: { id: SyncStateId.Catalog },
      update: {},
      create: { id: SyncStateId.Catalog, status: SYNC_STATUS.Idle },
    });
  }

  async setCatalogSyncState(status: SyncStatus, error?: string): Promise<void> {
    await this.prisma.syncState.upsert({
      where: { id: SyncStateId.Catalog },
      update: {
        status,
        error: error ?? null,
        lastSyncAt: status === SYNC_STATUS.Running ? undefined : new Date(),
      },
      create: {
        id: SyncStateId.Catalog,
        status,
        error: error ?? null,
        lastSyncAt: status === SYNC_STATUS.Running ? null : new Date(),
      },
    });
  }
}
