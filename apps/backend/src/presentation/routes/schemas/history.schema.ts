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

export const historyLimitQuerySchema = z.object({
  query: z.object({
    limit: z
      .string()
      .optional()
      .transform((v) => (v !== undefined ? parseInt(v, 10) : undefined))
      .pipe(z.number().int().positive().max(1000).optional()),
  }),
});

export type HistoryLimitQuery = z.infer<typeof historyLimitQuerySchema>["query"];
