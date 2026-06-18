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
        by: ["trackUrl", "trackName", "artist", "album", "albumCoverUrl"],
        _count: { trackUrl: true },
        _max: { playedAt: true },
        orderBy: [{ _count: { trackUrl: "desc" } }, { _max: { playedAt: "desc" } }],
        take: limit,
      });

      return rows.map((row) => ({
        trackUrl: row.trackUrl,
        trackName: row.trackName,
        artist: row.artist,
        album: row.album,
        albumCoverUrl: row.albumCoverUrl,
        playCount: row._count.trackUrl,
        lastPlayedAt: Number(row._max.playedAt ?? 0),
      }));
    } catch (_error) {
      throw new AppError(500, "internal_server_error", "Failed to retrieve top tracks");
    }
  }

  async getTopArtists(limit: number): Promise<TopArtistItem[]> {
    try {
      const rows = await prisma.playHistory.groupBy({
        by: ["artist"],
        _count: { artist: true },
        _max: { playedAt: true },
        orderBy: [{ _count: { artist: "desc" } }, { _max: { playedAt: "desc" } }],
        take: limit,
      });

      return rows.map((row) => ({
        artist: row.artist,
        playCount: row._count.artist,
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
