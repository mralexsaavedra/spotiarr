import { z } from "zod";

export const recordPlaySchema = z.object({
  body: z.object({
    trackId: z.string().nullable().default(null),
    trackUrl: z.string().nullable().default(null),
    trackName: z.string().min(1),
    artist: z.string().min(1),
    album: z.string().nullable().default(null),
    albumCoverUrl: z.string().nullable().default(null),
    durationMs: z.number().int().nonnegative().nullable().default(null),
    playedAt: z.number().int().nonnegative(),
  }),
});

export type RecordPlayBody = z.infer<typeof recordPlaySchema>["body"];
