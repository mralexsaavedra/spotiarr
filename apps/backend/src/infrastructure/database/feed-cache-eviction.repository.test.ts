import { describe, expect, it, vi } from "vitest";
import { FeedCacheEvictionRepository } from "./feed-cache-eviction.repository";

describe("FeedCacheEvictionRepository", () => {
  it("evicts all tables when artistIds is empty", async () => {
    const prisma = {
      $transaction: vi.fn().mockResolvedValue(undefined),
      followedArtistCache: { deleteMany: vi.fn().mockReturnValue(Promise.resolve()) },
      artistAlbumCache: { deleteMany: vi.fn().mockReturnValue(Promise.resolve()) },
      artistReleaseCache: { deleteMany: vi.fn().mockReturnValue(Promise.resolve()) },
    } as any;

    const repo = new FeedCacheEvictionRepository(prisma);
    await repo.evictStaleFeedCache([], 90);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});
