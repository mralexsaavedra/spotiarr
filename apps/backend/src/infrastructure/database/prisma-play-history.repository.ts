import type { RecordPlayInput } from "@spotiarr/shared";
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
}
