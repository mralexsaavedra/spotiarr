import { describe, expect, it, vi } from "vitest";
import { FollowedArtistRepository } from "./followed-artist.repository";

describe("FollowedArtistRepository", () => {
  it("returns empty identities for empty input", async () => {
    const prisma = { followedArtistCache: { findMany: vi.fn() } } as any;
    const repo = new FollowedArtistRepository(prisma);
    const result = await repo.getArtistCatalogIdentities([]);
    expect(result).toEqual([]);
    expect(prisma.followedArtistCache.findMany).not.toHaveBeenCalled();
  });

  it("updates identities transactionally", async () => {
    const prisma = {
      $transaction: vi.fn().mockResolvedValue(undefined),
      followedArtistCache: { update: vi.fn().mockReturnValue(Promise.resolve()) },
    } as any;
    const repo = new FollowedArtistRepository(prisma);
    await repo.updateArtistCatalogIdentities([{ spotifyId: "a1", deezerId: "d1" }]);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });
});
