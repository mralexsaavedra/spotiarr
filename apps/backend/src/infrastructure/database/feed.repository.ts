import type { PrismaClient } from "@prisma/client";
import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";

export const SYNC_STATUS = {
  Idle: "idle",
  Running: "running",
  Error: "error",
} as const;

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

const parseSpotifyDate = (value?: string | null): Date | null => {
  if (!value) return null;

  const parts = value.split("-");
  const year = Number(parts[0]);
  let month = parts.length >= 2 ? Number(parts[1]) - 1 : 0;
  let day = parts.length >= 3 ? Number(parts[2]) : 1;

  if (Number.isNaN(year) || year <= 0) return null;
  if (Number.isNaN(month) || month < 0 || month > 11) month = 0;
  if (Number.isNaN(day) || day <= 0 || day > 31) day = 1;

  return new Date(year, month, day);
};

interface SyncStateRecord {
  id: number;
  lastSyncAt: Date | null;
  status: string;
  error: string | null;
}

export class FeedRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private mapArtistAlbumRowToRelease(row: {
    spotifyArtistId: string;
    albumId: string;
    albumName: string;
    albumType: string | null;
    releaseDate: string | null;
    coverUrl: string | null;
    spotifyUrl: string | null;
    totalTracks: number | null;
  }): ArtistRelease {
    return {
      artistId: row.spotifyArtistId,
      artistName: "Unknown Artist",
      artistImageUrl: null,
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

  async getArtistAlbumCount(spotifyArtistId: string): Promise<number> {
    return this.prisma.artistAlbumCache.count({
      where: { spotifyArtistId },
    });
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

    return rows.map((row) => this.mapArtistAlbumRowToRelease(row));
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
}
