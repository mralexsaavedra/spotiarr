import { describe, expect, it, vi } from "vitest";
import { ArtistReleaseCacheRepository } from "./artist-release-cache.repository";

describe("ArtistReleaseCacheRepository", () => {
  it("uses default lookback when input is invalid", async () => {
    const prisma = {
      artistReleaseCache: { findMany: vi.fn().mockResolvedValue([]) },
    } as any;
    const repo = new ArtistReleaseCacheRepository(prisma);
    await repo.getReleases(Number.NaN);
    expect(prisma.artistReleaseCache.findMany).toHaveBeenCalledOnce();
  });

  it("returns null when release is not found", async () => {
    const prisma = { artistReleaseCache: { findUnique: vi.fn().mockResolvedValue(null) } } as any;
    const repo = new ArtistReleaseCacheRepository(prisma);
    await expect(repo.getArtistReleaseWithArtist("a", "b")).resolves.toBeNull();
  });
});
