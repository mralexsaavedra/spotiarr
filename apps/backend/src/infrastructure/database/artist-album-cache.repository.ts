import type { PrismaClient } from "@prisma/client";
import type { ArtistRelease } from "@spotiarr/shared";
import type {
  AlbumIdentityInput,
  ArtistAlbumCacheWithArtist,
  ArtistAlbumSpotifyUrlInput,
} from "@/application/ports/feed-repository.port";
import { mapArtistAlbumRowToRelease } from "./feed-row-mappers";

export class ArtistAlbumCacheRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getArtistAlbumWithArtist(
    spotifyArtistId: string,
    albumId: string,
  ): Promise<ArtistAlbumCacheWithArtist | null> {
    const row = await this.prisma.artistAlbumCache.findUnique({
      where: { id: `${spotifyArtistId}:${albumId}` },
    });
    if (!row) return null;
    const artistRow = await this.prisma.followedArtistCache.findUnique({
      where: { spotifyId: spotifyArtistId },
      select: { name: true },
    });
    return { ...row, artistName: artistRow?.name ?? "Unknown Artist" };
  }

  async upsertArtistAlbumSpotifyUrl(input: ArtistAlbumSpotifyUrlInput): Promise<void> {
    const now = new Date();
    const id = `${input.artistId}:${input.albumId}`;
    await this.prisma.artistAlbumCache.upsert({
      where: { id },
      update: {
        spotifyUrl: input.spotifyUrl,
        albumName: input.albumName,
        albumType: input.albumType,
        releaseDate: input.releaseDate,
        coverUrl: input.coverUrl,
        totalTracks: input.totalTracks ?? undefined,
        syncedAt: now,
      },
      create: {
        id,
        spotifyArtistId: input.artistId,
        albumId: input.albumId,
        albumName: input.albumName,
        albumType: input.albumType,
        releaseDate: input.releaseDate,
        coverUrl: input.coverUrl,
        spotifyUrl: input.spotifyUrl,
        totalTracks: input.totalTracks ?? null,
        syncedAt: now,
      },
    });
  }

  async updateArtistAlbumIdentities(id: string, identities: AlbumIdentityInput): Promise<void> {
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
    return this.prisma.artistAlbumCache.count({ where: { spotifyArtistId } });
  }

  async getArtistAlbumsFreshness(spotifyArtistId: string): Promise<Date | null> {
    const row = await this.prisma.artistAlbumCache.findFirst({
      where: { spotifyArtistId },
      orderBy: { syncedAt: "desc" },
      select: { syncedAt: true },
    });
    return row?.syncedAt ?? null;
  }

  async getArtistIdsWithFreshAlbums(cutoffDate: Date): Promise<Set<string>> {
    const rows = await this.prisma.artistAlbumCache.findMany({
      where: { syncedAt: { gte: cutoffDate } },
      select: { spotifyArtistId: true },
      distinct: ["spotifyArtistId"],
    });
    return new Set(rows.map((r) => r.spotifyArtistId));
  }

  async getArtistAlbums(
    spotifyArtistId: string,
    limit: number,
    offset = 0,
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
    return rows.map((row) => mapArtistAlbumRowToRelease(row, artistMeta));
  }

  async upsertArtistAlbums(albums: ArtistRelease[]): Promise<void> {
    if (albums.length === 0) return;
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
}
