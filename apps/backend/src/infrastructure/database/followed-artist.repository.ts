import type { PrismaClient } from "@prisma/client";
import type { FollowedArtist } from "@spotiarr/shared";
import type {
  CatalogIdentity,
  CatalogIdentityInput,
} from "@/application/ports/feed-repository.port";

export class FollowedArtistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getArtistBySpotifyId(spotifyId: string): Promise<FollowedArtist | null> {
    const row = await this.prisma.followedArtistCache.findUnique({ where: { spotifyId } });
    if (!row) return null;
    return {
      id: row.spotifyId,
      name: row.name,
      image: row.imageUrl ?? null,
      spotifyUrl: row.spotifyUrl ?? null,
    };
  }

  async getArtistCatalogIdentities(spotifyIds: string[]): Promise<CatalogIdentity[]> {
    if (spotifyIds.length === 0) return [];
    const rows = await this.prisma.followedArtistCache.findMany({
      where: { spotifyId: { in: spotifyIds } },
      select: { spotifyId: true, deezerId: true, mbid: true },
    });
    const rowMap = new Map(rows.map((r) => [r.spotifyId, r]));
    return spotifyIds.map((id) => ({
      spotifyId: id,
      deezerId: rowMap.get(id)?.deezerId ?? null,
      mbid: rowMap.get(id)?.mbid ?? null,
    }));
  }

  async updateArtistCatalogIdentities(identities: CatalogIdentityInput[]): Promise<void> {
    if (identities.length === 0) return;
    await this.prisma.$transaction(
      identities.map(({ spotifyId, deezerId, mbid }) =>
        this.prisma.followedArtistCache.update({
          where: { spotifyId },
          data: {
            ...(deezerId !== undefined ? { deezerId } : {}),
            ...(mbid !== undefined ? { mbid } : {}),
          },
        }),
      ),
    );
  }

  async getArtists(): Promise<FollowedArtist[]> {
    const rows = await this.prisma.followedArtistCache.findMany({ orderBy: { name: "asc" } });
    return rows.map((row) => ({
      id: row.spotifyId,
      name: row.name,
      image: row.imageUrl ?? null,
      spotifyUrl: row.spotifyUrl ?? null,
    }));
  }

  async upsertArtists(artists: FollowedArtist[]): Promise<void> {
    const now = new Date();
    await this.prisma.$transaction(
      artists.map((artist) =>
        this.prisma.followedArtistCache.upsert({
          where: { spotifyId: artist.id },
          update: {
            name: artist.name,
            imageUrl: artist.image,
            spotifyUrl: artist.spotifyUrl,
            syncedAt: now,
          },
          create: {
            spotifyId: artist.id,
            name: artist.name,
            imageUrl: artist.image,
            spotifyUrl: artist.spotifyUrl,
            syncedAt: now,
          },
        }),
      ),
    );
  }

  async getArtistIdsWithNoAlbums(): Promise<Set<string>> {
    const allArtists = await this.prisma.followedArtistCache.findMany({
      select: { spotifyId: true },
    });
    const artistsWithAlbums = await this.prisma.artistAlbumCache.findMany({
      select: { spotifyArtistId: true },
      distinct: ["spotifyArtistId"],
    });
    const withAlbumsSet = new Set(artistsWithAlbums.map((r) => r.spotifyArtistId));
    return new Set(allArtists.map((r) => r.spotifyId).filter((id) => !withAlbumsSet.has(id)));
  }

  async getArtistIdsNeedingCatalogSync(cutoffDate: Date, limit: number): Promise<string[]> {
    const rows = await this.prisma.followedArtistCache.findMany({
      where: { OR: [{ lastCatalogSyncAt: null }, { lastCatalogSyncAt: { lt: cutoffDate } }] },
      orderBy: { lastCatalogSyncAt: { sort: "asc", nulls: "first" } },
      take: limit,
      select: { spotifyId: true },
    });
    return rows.map((r) => r.spotifyId);
  }

  async updateArtistCatalogSyncedAt(artistIds: string[]): Promise<void> {
    if (artistIds.length === 0) return;
    const now = new Date();
    await this.prisma.$transaction(
      artistIds.map((id) =>
        this.prisma.followedArtistCache.update({
          where: { spotifyId: id },
          data: { lastCatalogSyncAt: now },
        }),
      ),
    );
  }

  async updateArtistReleasesSyncedAt(artistIds: string[]): Promise<void> {
    if (artistIds.length === 0) return;
    const now = new Date();
    await this.prisma.$transaction(
      artistIds.map((id) =>
        this.prisma.followedArtistCache.update({
          where: { spotifyId: id },
          data: { lastReleasesSyncAt: now },
        }),
      ),
    );
  }

  async getActiveArtistIdsForReleasesSync(
    releaseCutoff: Date,
    activityWindowDate: Date,
    limit: number,
  ): Promise<string[]> {
    const activityWindowStr = activityWindowDate.toISOString().slice(0, 10);
    const rows = await this.prisma.followedArtistCache.findMany({
      where: {
        OR: [{ lastReleasesSyncAt: null }, { lastReleasesSyncAt: { lt: releaseCutoff } }],
        AND: [
          {
            OR: [
              { lastCatalogSyncAt: null },
              { releases: { some: { releaseDate: { gte: activityWindowStr } } } },
            ],
          },
        ],
      },
      orderBy: { lastReleasesSyncAt: { sort: "asc", nulls: "first" } },
      take: limit,
      select: { spotifyId: true },
    });
    return rows.map((r) => r.spotifyId);
  }
}
