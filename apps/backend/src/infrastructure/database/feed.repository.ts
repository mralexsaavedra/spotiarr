import type { PrismaClient } from "@prisma/client";
import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";

export interface CatalogIdentity {
  spotifyId: string;
  deezerId: string | null;
  mbid: string | null;
}

export const SYNC_STATUS = {
  Idle: "idle",
  Running: "running",
  Error: "error",
} as const;

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

interface SyncStateRecord {
  id: number;
  lastSyncAt: Date | null;
  status: string;
  error: string | null;
}

export class FeedRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapArtistAlbumRowToRelease(
    row: {
      spotifyArtistId: string;
      albumId: string;
      albumName: string;
      albumType: string | null;
      releaseDate: string | null;
      coverUrl: string | null;
      spotifyUrl: string | null;
      totalTracks: number | null;
    },
    artistMeta?: { name?: string | null; imageUrl?: string | null },
  ): ArtistRelease {
    return {
      artistId: row.spotifyArtistId,
      artistName: artistMeta?.name ?? "Unknown Artist",
      artistImageUrl: artistMeta?.imageUrl ?? null,
      albumId: row.albumId,
      albumName: row.albumName,
      albumType: row.albumType as ArtistRelease["albumType"],
      releaseDate: row.releaseDate ?? undefined,
      coverUrl: row.coverUrl,
      spotifyUrl: row.spotifyUrl ?? undefined,
      totalTracks: row.totalTracks ?? undefined,
    };
  }

  async getArtistBySpotifyId(spotifyId: string): Promise<FollowedArtist | null> {
    const row = await this.prisma.followedArtistCache.findUnique({
      where: { spotifyId },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.spotifyId,
      name: row.name,
      image: row.imageUrl ?? null,
      spotifyUrl: row.spotifyUrl ?? null,
    };
  }

  async getArtistCatalogIdentities(spotifyIds: string[]): Promise<CatalogIdentity[]> {
    if (spotifyIds.length === 0) {
      return [];
    }

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

  async updateArtistCatalogIdentities(
    identities: Array<{ spotifyId: string; deezerId?: string | null; mbid?: string | null }>,
  ): Promise<void> {
    if (identities.length === 0) {
      return;
    }

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

  async getReleases(lookbackDays: number): Promise<ArtistRelease[]> {
    const safeDays = Number.isFinite(lookbackDays) && lookbackDays > 0 ? lookbackDays : 30;
    const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const rows = await this.prisma.artistReleaseCache.findMany({
      where: { releaseDate: { not: null, gte: cutoff } },
      include: { artist: true },
      orderBy: { releaseDate: "desc" },
    });

    return rows
      .map<ArtistRelease>((row) => ({
        artistId: row.artistId,
        artistName: row.artist.name,
        artistImageUrl: row.artist.imageUrl ?? null,
        albumId: row.albumId,
        albumName: row.albumName,
        albumType: row.albumType as ArtistRelease["albumType"],
        releaseDate: row.releaseDate ?? undefined,
        coverUrl: row.coverUrl ?? null,
        spotifyUrl: row.spotifyUrl ?? undefined,
      }))
      .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
  }

  async getArtists(): Promise<FollowedArtist[]> {
    const rows = await this.prisma.followedArtistCache.findMany({
      orderBy: { name: "asc" },
    });

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

  async upsertReleases(releases: ArtistRelease[]): Promise<void> {
    const now = new Date();

    await this.prisma.$transaction(
      releases.map((release) => {
        const id = `${release.artistId}:${release.albumId}`;

        return this.prisma.artistReleaseCache.upsert({
          where: { id },
          update: {
            artistId: release.artistId,
            albumId: release.albumId,
            albumName: release.albumName,
            albumType: release.albumType,
            releaseDate: release.releaseDate,
            coverUrl: release.coverUrl,
            spotifyUrl: release.spotifyUrl,
            syncedAt: now,
          },
          create: {
            id,
            artistId: release.artistId,
            albumId: release.albumId,
            albumName: release.albumName,
            albumType: release.albumType,
            releaseDate: release.releaseDate,
            coverUrl: release.coverUrl,
            spotifyUrl: release.spotifyUrl,
            syncedAt: now,
          },
        });
      }),
    );
  }

  async getArtistAlbumWithArtist(
    spotifyArtistId: string,
    albumId: string,
  ): Promise<
    | ({
        id: string;
        spotifyArtistId: string;
        albumId: string;
        albumName: string;
        albumType: string | null;
        releaseDate: string | null;
        coverUrl: string | null;
        spotifyUrl: string | null;
        totalTracks: number | null;
        deezerAlbumId: string | null;
        mbAlbumId: string | null;
      } & {
        artistName: string;
      })
    | null
  > {
    const row = await this.prisma.artistAlbumCache.findUnique({
      where: {
        id: `${spotifyArtistId}:${albumId}`,
      },
    });

    if (!row) {
      return null;
    }

    const artistRow = await this.prisma.followedArtistCache.findUnique({
      where: { spotifyId: spotifyArtistId },
      select: { name: true },
    });

    return {
      ...row,
      artistName: artistRow?.name ?? "Unknown Artist",
    };
  }

  async updateArtistAlbumIdentities(
    id: string,
    identities: {
      deezerAlbumId?: string | null;
      mbAlbumId?: string | null;
    },
  ): Promise<void> {
    await this.prisma.artistAlbumCache.update({
      where: { id },
      data: {
        ...(identities.deezerAlbumId !== undefined
          ? { deezerAlbumId: identities.deezerAlbumId }
          : {}),
        ...(identities.mbAlbumId !== undefined ? { mbAlbumId: identities.mbAlbumId } : {}),
      },
    });
  }

  async getArtistAlbumCount(spotifyArtistId: string): Promise<number> {
    return this.prisma.artistAlbumCache.count({
      where: { spotifyArtistId },
    });
  }

  /**
   * Returns the most recent `syncedAt` for an artist's albums, or null
   * if the artist has no cached albums.
   */
  async getArtistAlbumsFreshness(spotifyArtistId: string): Promise<Date | null> {
    const row = await this.prisma.artistAlbumCache.findFirst({
      where: { spotifyArtistId },
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    });
    return row?.syncedAt ?? null;
  }

  /**
   * Returns artistIds that have NO albums at all in the cache.
   * These are prioritized in the sync — a user visiting them will always
   * see "rate limited" until they are populated.
   */
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

  /**
   * Returns the set of artistIds that already have fresh album data in the cache.
   * "Fresh" means at least one album with syncedAt newer than cutoffDate.
   * Used by the sync to skip artists that don't need a Spotify call.
   */
  async getArtistIdsWithFreshAlbums(cutoffDate: Date): Promise<Set<string>> {
    const rows = await this.prisma.artistAlbumCache.findMany({
      where: { syncedAt: { gte: cutoffDate } },
      select: { spotifyArtistId: true },
      distinct: ["spotifyArtistId"],
    });
    return new Set(rows.map((r) => r.spotifyArtistId));
  }

  /**
   * Returns the set of artistIds that already have fresh release data in the cache.
   * "Fresh" means at least one release with syncedAt newer than cutoffDate.
   * Used by the sync to skip artists that don't need a Spotify call.
   */
  async getArtistIdsWithFreshReleases(cutoffDate: Date): Promise<Set<string>> {
    const rows = await this.prisma.artistReleaseCache.findMany({
      where: { syncedAt: { gte: cutoffDate } },
      select: { artistId: true },
      distinct: ["artistId"],
    });
    return new Set(rows.map((r) => r.artistId));
  }

  async getArtistAlbums(
    spotifyArtistId: string,
    limit: number,
    offset: number = 0,
  ): Promise<ArtistRelease[]> {
    const rows = await this.prisma.artistAlbumCache.findMany({
      where: { spotifyArtistId },
      orderBy: [{ releaseDate: "desc" }, { albumId: "asc" }],
      skip: offset,
      take: limit,
    });

    const artistRow = await this.prisma.followedArtistCache.findUnique({
      where: { spotifyId: spotifyArtistId },
    });

    const artistMeta = artistRow
      ? { name: artistRow.name, imageUrl: artistRow.imageUrl }
      : undefined;

    return rows.map((row) => this.mapArtistAlbumRowToRelease(row, artistMeta));
  }

  async upsertArtistAlbums(albums: ArtistRelease[]): Promise<void> {
    if (albums.length === 0) {
      return;
    }

    const now = new Date();

    await this.prisma.$transaction(
      albums.map((album) => {
        const id = `${album.artistId}:${album.albumId}`;

        return this.prisma.artistAlbumCache.upsert({
          where: { id },
          update: {
            spotifyArtistId: album.artistId,
            albumId: album.albumId,
            albumName: album.albumName,
            albumType: album.albumType,
            releaseDate: album.releaseDate,
            coverUrl: album.coverUrl,
            spotifyUrl: album.spotifyUrl,
            totalTracks: album.totalTracks ?? null,
            syncedAt: now,
          },
          create: {
            id,
            spotifyArtistId: album.artistId,
            albumId: album.albumId,
            albumName: album.albumName,
            albumType: album.albumType,
            releaseDate: album.releaseDate,
            coverUrl: album.coverUrl,
            spotifyUrl: album.spotifyUrl,
            totalTracks: album.totalTracks ?? null,
            syncedAt: now,
          },
        });
      }),
    );
  }

  async evictStaleFeedCache(artistIds: string[], cutoffDays = 90): Promise<void> {
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
      this.prisma.followedArtistCache.deleteMany({
        where: { spotifyId: { notIn: artistIds } },
      }),
      this.prisma.artistAlbumCache.deleteMany({
        where: {
          OR: [{ syncedAt: { lt: cutoff } }, { spotifyArtistId: { notIn: artistIds } }],
        },
      }),
      this.prisma.artistReleaseCache.deleteMany({
        where: {
          OR: [{ syncedAt: { lt: cutoff } }, { artistId: { notIn: artistIds } }],
        },
      }),
    ]);
  }

  async getArtistIdsNeedingCatalogSync(cutoffDate: Date, limit: number): Promise<string[]> {
    const rows = await this.prisma.followedArtistCache.findMany({
      where: {
        OR: [{ lastCatalogSyncAt: null }, { lastCatalogSyncAt: { lt: cutoffDate } }],
      },
      orderBy: { lastCatalogSyncAt: { sort: "asc", nulls: "first" } },
      take: limit,
      select: { spotifyId: true },
    });
    return rows.map((r) => r.spotifyId);
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
              {
                releases: {
                  some: {
                    releaseDate: { gte: activityWindowStr },
                  },
                },
              },
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

  async updateArtistCatalogSyncedAt(artistIds: string[]): Promise<void> {
    if (artistIds.length === 0) {
      return;
    }

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
    if (artistIds.length === 0) {
      return;
    }

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

  async getSyncState(): Promise<SyncStateRecord> {
    return this.prisma.syncState.upsert({
      where: { id: 1 },
      update: {},
      create: {
        id: 1,
        status: SYNC_STATUS.Idle,
      },
    });
  }

  async setSyncState(status: SyncStatus, error?: string): Promise<void> {
    await this.prisma.syncState.upsert({
      where: { id: 1 },
      update: {
        status,
        error: error ?? null,
        lastSyncAt: status === SYNC_STATUS.Running ? undefined : new Date(),
      },
      create: {
        id: 1,
        status,
        error: error ?? null,
        lastSyncAt: status === SYNC_STATUS.Running ? null : new Date(),
      },
    });
  }

  async getCatalogSyncState(): Promise<SyncStateRecord> {
    return this.prisma.syncState.upsert({
      where: { id: 2 },
      update: {},
      create: {
        id: 2,
        status: SYNC_STATUS.Idle,
      },
    });
  }

  async setCatalogSyncState(status: SyncStatus, error?: string): Promise<void> {
    await this.prisma.syncState.upsert({
      where: { id: 2 },
      update: {
        status,
        error: error ?? null,
        lastSyncAt: status === SYNC_STATUS.Running ? undefined : new Date(),
      },
      create: {
        id: 2,
        status,
        error: error ?? null,
        lastSyncAt: status === SYNC_STATUS.Running ? null : new Date(),
      },
    });
  }
}
