import { describe, expect, it, vi } from "vitest";
import { FeedCacheEvictionRepository } from "./feed-cache-eviction.repository";

describe("FeedCacheEvictionRepository", () => {
  it("evicts all tables when artistIds is empty", async () => {
    const deleteFollowedResult = Promise.resolve({ count: 1 });
    const deleteAlbumResult = Promise.resolve({ count: 2 });
    const deleteReleaseResult = Promise.resolve({ count: 3 });
    const prisma = {
      $transaction: vi.fn().mockResolvedValue(undefined),
      followedArtistCache: { deleteMany: vi.fn().mockReturnValue(deleteFollowedResult) },
      artistAlbumCache: { deleteMany: vi.fn().mockReturnValue(deleteAlbumResult) },
      artistReleaseCache: { deleteMany: vi.fn().mockReturnValue(deleteReleaseResult) },
    } as any;

    const repo = new FeedCacheEvictionRepository(prisma);
    await repo.evictStaleFeedCache([], 90);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.$transaction).toHaveBeenCalledWith([
      deleteFollowedResult,
      deleteAlbumResult,
      deleteReleaseResult,
    ]);
    expect(prisma.followedArtistCache.deleteMany).toHaveBeenCalledWith({});
    expect(prisma.artistAlbumCache.deleteMany).toHaveBeenCalledWith({});
    expect(prisma.artistReleaseCache.deleteMany).toHaveBeenCalledWith({});
  });
});
