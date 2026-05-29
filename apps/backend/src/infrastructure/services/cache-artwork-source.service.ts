import type { PrismaClient } from "@prisma/client";
import type {
  ArtworkBackfillCacheSourcePort,
  ArtworkBackfillCandidate,
  ArtworkBackfillCandidateSourcePort,
} from "@/application/ports/artwork-backfill-sources.port";

const normalize = (value: string): string => value.trim().toLowerCase();

export class CacheArtworkSourceService
  implements ArtworkBackfillCacheSourcePort, ArtworkBackfillCandidateSourcePort
{
  constructor(private readonly prisma: PrismaClient) {}

  async getArtistCandidates(
    limit: number,
    cursorValue?: string | null,
  ): Promise<ArtworkBackfillCandidate[]> {
    const rows = await this.prisma.followedArtistCache.findMany({
      orderBy: { spotifyId: "asc" },
      take: Math.max(limit, 1),
      ...(cursorValue
        ? {
            cursor: {
              spotifyId: cursorValue.replace("artist:", ""),
            },
            skip: 1,
          }
        : {}),
    });

    return rows.map((row) => ({
      type: "artist",
      cursorValue: `artist:${row.spotifyId}`,
      artistName: row.name,
      artistSpotifyId: row.spotifyId,
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
