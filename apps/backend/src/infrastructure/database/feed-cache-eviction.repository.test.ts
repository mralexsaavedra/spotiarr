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

  it("uses cutoff-based deleteMany with OR clauses when artistIds is non-empty", async () => {
    const artistIds = ["artist1", "artist2"];
    const cutoffDays = 30;

    const deleteFollowedResult = Promise.resolve({ count: 0 });
    const deleteAlbumResult = Promise.resolve({ count: 1 });
    const deleteReleaseResult = Promise.resolve({ count: 2 });

    const prisma = {
      $transaction: vi.fn().mockResolvedValue(undefined),
      followedArtistCache: { deleteMany: vi.fn().mockReturnValue(deleteFollowedResult) },
      artistAlbumCache: { deleteMany: vi.fn().mockReturnValue(deleteAlbumResult) },
      artistReleaseCache: { deleteMany: vi.fn().mockReturnValue(deleteReleaseResult) },
    } as any;

    const before = Date.now();
    const repo = new FeedCacheEvictionRepository(prisma);
    await repo.evictStaleFeedCache(artistIds, cutoffDays);
    const after = Date.now();

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.$transaction).toHaveBeenCalledWith([
      deleteFollowedResult,
      deleteAlbumResult,
      deleteReleaseResult,
    ]);

    // followedArtistCache: notIn artistIds
    expect(prisma.followedArtistCache.deleteMany).toHaveBeenCalledWith({
      where: { spotifyId: { notIn: artistIds } },
    });

    // albumCache: OR syncedAt < cutoff, spotifyArtistId notIn artistIds
    const albumCall = prisma.artistAlbumCache.deleteMany.mock.calls[0][0];
    expect(albumCall.where.OR).toHaveLength(2);
    expect(albumCall.where.OR[1]).toEqual({ spotifyArtistId: { notIn: artistIds } });
    // cutoff date should be roughly (before - cutoffDays*ms) to (after - cutoffDays*ms)
    const cutoffMs = cutoffDays * 24 * 60 * 60 * 1000;
    const cutoffDate: Date = albumCall.where.OR[0].syncedAt.lt;
    expect(cutoffDate.getTime()).toBeGreaterThanOrEqual(before - cutoffMs);
    expect(cutoffDate.getTime()).toBeLessThanOrEqual(after - cutoffMs + 1000);

    // releaseCache: OR syncedAt < cutoff, artistId notIn artistIds
    const releaseCall = prisma.artistReleaseCache.deleteMany.mock.calls[0][0];
    expect(releaseCall.where.OR).toHaveLength(2);
    expect(releaseCall.where.OR[1]).toEqual({ artistId: { notIn: artistIds } });
  });
});
