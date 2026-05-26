import type { PrismaClient } from "@prisma/client";

export class FeedCacheEvictionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async evictStaleFeedCache(artistIds: string[], cutoffDays: number): Promise<void> {
    if (artistIds.length === 0) {
      await this.prisma.$transaction([
        this.prisma.followedArtistCache.deleteMany({}),
        this.prisma.artistAlbumCache.deleteMany({}),
        this.prisma.artistReleaseCache.deleteMany({}),
      ]);
      return;
    }

    const cutoff = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);
    await this.prisma.$transaction([
      this.prisma.followedArtistCache.deleteMany({ where: { spotifyId: { notIn: artistIds } } }),
      this.prisma.artistAlbumCache.deleteMany({
        where: { OR: [{ syncedAt: { lt: cutoff } }, { spotifyArtistId: { notIn: artistIds } }] },
      }),
      this.prisma.artistReleaseCache.deleteMany({
        where: { OR: [{ syncedAt: { lt: cutoff } }, { artistId: { notIn: artistIds } }] },
      }),
    ]);
  }
}
