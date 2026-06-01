import type { PrismaClient } from "@prisma/client";
import { readdir } from "node:fs/promises";
import type {
  ArtworkBackfillCacheSourcePort,
  ArtworkBackfillCandidate,
  ArtworkBackfillCandidateSourcePort,
} from "@/application/ports/artwork-backfill-sources.port";
import type { FileSystemTrackPathPort } from "@/application/ports/file-system.port";

const normalize = (value: string): string => value.trim().toLowerCase();

export class CacheArtworkSourceService
  implements ArtworkBackfillCacheSourcePort, ArtworkBackfillCandidateSourcePort
{
  constructor(
    private readonly prisma: PrismaClient,
    private readonly pathPort: FileSystemTrackPathPort,
  ) {}

  async getArtistCandidates(
    limit: number,
    cursorValue?: string | null,
  ): Promise<ArtworkBackfillCandidate[]> {
    const names = await this.readLibraryArtistNames();
    const startAfter = cursorValue?.replace("artist:", "") ?? null;
    const filtered = startAfter ? names.filter((name) => name > startAfter) : names;
    const rows = filtered.slice(0, Math.max(limit, 1));

    const followed = await this.prisma.followedArtistCache.findMany({
      where: { name: { in: rows } },
      select: { name: true, spotifyId: true },
    });
    const spotifyIdByName = new Map(followed.map((row) => [normalize(row.name), row.spotifyId]));

    return rows.map((name) => ({
      type: "artist",
      cursorValue: `artist:${name}`,
      artistName: name,
      artistSpotifyId: spotifyIdByName.get(normalize(name)) ?? null,
    }));
  }

  async getAlbumCandidates(
    limit: number,
    cursorValue?: string | null,
  ): Promise<ArtworkBackfillCandidate[]> {
    const rows = await this.prisma.artistAlbumCache.findMany({
      orderBy: { id: "asc" },
      take: Math.max(limit, 1),
      ...(cursorValue
        ? {
            cursor: {
              id: cursorValue.replace("album:", ""),
            },
            skip: 1,
          }
        : {}),
    });

    const artistIds = [...new Set(rows.map((row) => row.spotifyArtistId))];
    const artists = await this.prisma.followedArtistCache.findMany({
      where: { spotifyId: { in: artistIds } },
      select: { spotifyId: true, name: true },
    });
    const nameById = new Map(artists.map((artist) => [artist.spotifyId, artist.name]));

    return rows.map((row) => ({
      type: "album",
      cursorValue: `album:${row.id}`,
      artistName: nameById.get(row.spotifyArtistId) ?? row.spotifyArtistId,
      albumName: row.albumName,
      artistSpotifyId: row.spotifyArtistId,
      albumSpotifyId: row.albumId,
    }));
  }

  async findArtistImageUrl(candidate: ArtworkBackfillCandidate): Promise<string | null> {
    if (candidate.artistSpotifyId) {
      const direct = await this.prisma.followedArtistCache.findUnique({
        where: { spotifyId: candidate.artistSpotifyId },
        select: { imageUrl: true },
      });
      if (direct?.imageUrl) return direct.imageUrl;
    }

    const trackArtistImage = await this.prisma.track.findFirst({
      where: {
        OR: [{ artist: candidate.artistName }, { albumArtist: candidate.artistName }],
        primaryArtistImageUrl: { not: null },
      },
      select: { primaryArtistImageUrl: true },
    });
    if (trackArtistImage?.primaryArtistImageUrl) return trackArtistImage.primaryArtistImageUrl;

    const albumFallback = await this.prisma.track.findFirst({
      where: {
        OR: [{ artist: candidate.artistName }, { albumArtist: candidate.artistName }],
        albumCoverUrl: { not: null },
      },
      select: { albumCoverUrl: true },
    });
    if (albumFallback?.albumCoverUrl) return albumFallback.albumCoverUrl;

    const fallback = await this.prisma.followedArtistCache.findMany({
      select: { name: true, imageUrl: true },
      where: { imageUrl: { not: null } },
      take: 250,
    });
    const matched = fallback.find(
      (item) => normalize(item.name) === normalize(candidate.artistName),
    );
    if (matched?.imageUrl) return matched.imageUrl;

    const playlist = await this.prisma.playlist.findFirst({
      where: {
        OR: [{ owner: candidate.artistName }, { name: candidate.artistName }],
        artistImageUrl: { not: null },
      },
      select: { artistImageUrl: true },
    });
    return playlist?.artistImageUrl ?? null;
  }

  private async readLibraryArtistNames(): Promise<string[]> {
    const entries = await readdir(this.pathPort.getMusicLibraryPath(), { withFileTypes: true });

    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name.trim())
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
  }

  async findAlbumCoverUrl(candidate: ArtworkBackfillCandidate): Promise<string | null> {
    if (!candidate.albumName) return null;

    if (candidate.artistSpotifyId && candidate.albumSpotifyId) {
      const directAlbum = await this.prisma.artistAlbumCache.findUnique({
        where: { id: `${candidate.artistSpotifyId}:${candidate.albumSpotifyId}` },
        select: { coverUrl: true },
      });
      if (directAlbum?.coverUrl) return directAlbum.coverUrl;

      const directRelease = await this.prisma.artistReleaseCache.findUnique({
        where: { id: `${candidate.artistSpotifyId}:${candidate.albumSpotifyId}` },
        select: { coverUrl: true },
      });
      if (directRelease?.coverUrl) return directRelease.coverUrl;
    }

    const track = await this.prisma.track.findFirst({
      where: {
        album: candidate.albumName,
        OR: [{ albumArtist: candidate.artistName }, { artist: candidate.artistName }],
        albumCoverUrl: { not: null },
      },
      select: { albumCoverUrl: true },
    });
    return track?.albumCoverUrl ?? null;
  }
}
