import type {
  RecordPlayInput,
  TopTrackItem,
  TopArtistItem,
  RecentPlayItem,
} from "@spotiarr/shared";
import { z, ZodError } from "zod";
import { AppError } from "@/domain/errors/app-error";
import { prisma } from "../setup/prisma";

const recordPlayInputSchema = z.object({
  trackId: z.string().nullable(),
  trackUrl: z.string().nullable(),
  trackName: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().nullable(),
  albumCoverUrl: z.string().nullable(),
  durationMs: z.number().int().nonnegative().nullable(),
  playedAt: z.number().int().nonnegative(),
});

export class PrismaPlayHistoryRepository {
  async recordPlay(input: RecordPlayInput): Promise<void> {
    let validated: z.infer<typeof recordPlayInputSchema>;

    try {
      validated = recordPlayInputSchema.parse(input);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          400,
          "validation_error",
          error.issues[0]?.message ?? "Invalid play input",
        );
      }
      throw error;
    }

    try {
      await prisma.playHistory.create({
        data: {
          trackId: validated.trackId,
          trackUrl: validated.trackUrl,
          trackName: validated.trackName,
          artist: validated.artist,
          album: validated.album,
          albumCoverUrl: validated.albumCoverUrl,
          durationMs: validated.durationMs,
          playedAt: BigInt(validated.playedAt),
          createdAt: BigInt(Date.now()),
        },
      });
    } catch (_error) {
      throw new AppError(500, "internal_server_error", "Failed to record play event");
    }
  }

  async getTopTracks(limit: number): Promise<TopTrackItem[]> {
    try {
      const rows = await prisma.playHistory.groupBy({
        by: ["trackUrl", "trackName", "artist"],
        _count: { id: true },
        _max: { playedAt: true, album: true, albumCoverUrl: true },
        orderBy: [{ _count: { id: "desc" } }, { _max: { playedAt: "desc" } }],
        take: limit,
      });

      return rows.map((row) => ({
        trackUrl: row.trackUrl,
        trackName: row.trackName,
        artist: row.artist,
        album: row._max.album,
        albumCoverUrl: row._max.albumCoverUrl,
        playCount: row._count.id,
        lastPlayedAt: Number(row._max.playedAt ?? 0),
      }));
    } catch (_error) {
      throw new AppError(500, "internal_server_error", "Failed to retrieve top tracks");
    }
  }

  async getTopArtists(limit: number): Promise<TopArtistItem[]> {
    try {
      // First groupBy: play count + lastPlayedAt per artist (ordered, limited)
      const playRows = await prisma.playHistory.groupBy({
        by: ["artist"],
        _count: { id: true },
        _max: { playedAt: true },
        orderBy: [{ _count: { id: "desc" } }, { _max: { playedAt: "desc" } }],
        take: limit,
      });

      if (playRows.length === 0) return [];

      // Second groupBy: distinct (artist, trackName) pairs to compute trackCount per artist.
      // Prisma groupBy cannot COUNT(DISTINCT trackName) in a single call, so we run a
      // second pass grouped by ['artist','trackName'] and count rows per artist in code.
      const artistNames = playRows.map((r) => r.artist);
      const trackRows = await prisma.playHistory.groupBy({
        by: ["artist", "trackName"],
        where: { artist: { in: artistNames } },
        _count: { id: true },
      });

      // Build a lookup: artist → number of distinct trackName values
      const trackCountByArtist = new Map<string, number>();
      for (const row of trackRows) {
        trackCountByArtist.set(row.artist, (trackCountByArtist.get(row.artist) ?? 0) + 1);
      }

      return playRows.map((row) => ({
        artist: row.artist,
        playCount: row._count.id,
        trackCount: trackCountByArtist.get(row.artist) ?? 0,
        lastPlayedAt: Number(row._max.playedAt ?? 0),
      }));
    } catch (_error) {
      throw new AppError(500, "internal_server_error", "Failed to retrieve top artists");
    }
  }

  async getRecentPlays(limit: number): Promise<RecentPlayItem[]> {
    try {
      const rows = await prisma.playHistory.findMany({
        orderBy: { playedAt: "desc" },
        take: limit,
      });

      return rows.map((row) => ({
        trackId: row.trackId,
        trackUrl: row.trackUrl,
        trackName: row.trackName,
        artist: row.artist,
        album: row.album,
        playedAt: Number(row.playedAt),
      }));
    } catch (_error) {
      throw new AppError(500, "internal_server_error", "Failed to retrieve recent plays");
    }
  }
}
