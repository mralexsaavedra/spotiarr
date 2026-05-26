import type { PrismaClient } from "@prisma/client";
import type { ArtistRelease } from "@spotiarr/shared";
import type { ArtistReleaseCacheWithArtist } from "@/application/ports/feed-repository.port";
import { mapArtistReleaseRow } from "./feed-row-mappers";

export class ArtistReleaseCacheRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async getReleases(lookbackDays: number): Promise<ArtistRelease[]> {
    const safeDays = Number.isFinite(lookbackDays) && lookbackDays > 0 ? lookbackDays : 30;
    const cutoff = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    const rows = await this.prisma.artistReleaseCache.findMany({
      where: { releaseDate: { not: null, gte: cutoff, lte: today } },
      include: { artist: true },
      orderBy: { releaseDate: "desc" },
    });
    return rows
      .map((row) => mapArtistReleaseRow(row))
      .sort((a, b) => (b.releaseDate ?? "").localeCompare(a.releaseDate ?? ""));
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

  async getArtistReleaseWithArtist(
    artistId: string,
    albumId: string,
  ): Promise<ArtistReleaseCacheWithArtist | null> {
    const row = await this.prisma.artistReleaseCache.findUnique({
      where: { id: `${artistId}:${albumId}` },
      include: { artist: true },
    });
    if (!row) return null;
    const mapped = mapArtistReleaseRow(row);
    return {
      id: row.id,
      artistId: mapped.artistId,
      albumId: mapped.albumId,
      albumName: mapped.albumName,
      albumType: row.albumType,
      releaseDate: row.releaseDate,
      coverUrl: mapped.coverUrl ?? null,
      spotifyUrl: row.spotifyUrl,
      artistName: row.artist.name,
    };
  }

  async updateArtistReleaseSpotifyUrl(
    artistId: string,
    albumId: string,
    spotifyUrl: string,
  ): Promise<void> {
    await this.prisma.artistReleaseCache.updateMany({
      where: { id: `${artistId}:${albumId}` },
      data: { spotifyUrl, syncedAt: new Date() },
    });
  }

  async getArtistIdsWithFreshReleases(cutoffDate: Date): Promise<Set<string>> {
    const rows = await this.prisma.artistReleaseCache.findMany({
      where: { syncedAt: { gte: cutoffDate } },
      select: { artistId: true },
      distinct: ["artistId"],
    });
    return new Set(rows.map((r) => r.artistId));
  }
}
