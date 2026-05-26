import { describe, expect, it, vi } from "vitest";
import { ArtistAlbumCacheRepository } from "./artist-album-cache.repository";

describe("ArtistAlbumCacheRepository", () => {
  it("returns freshness date when found", async () => {
    const now = new Date();
    const prisma = {
      artistAlbumCache: { findFirst: vi.fn().mockResolvedValue({ syncedAt: now }) },
    } as any;
    const repo = new ArtistAlbumCacheRepository(prisma);
    await expect(repo.getArtistAlbumsFreshness("a1")).resolves.toEqual(now);
  });

  it("short-circuits empty album upserts", async () => {
    const prisma = { $transaction: vi.fn() } as any;
    const repo = new ArtistAlbumCacheRepository(prisma);
    await repo.upsertArtistAlbums([]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
