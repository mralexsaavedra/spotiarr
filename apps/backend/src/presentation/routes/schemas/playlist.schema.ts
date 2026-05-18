import { z } from "zod";

// Schema for creating a playlist — accepts discriminated union or legacy { spotifyUrl } body
const discriminatedBody = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("spotifyUrl"), spotifyUrl: z.string().min(1) }),
  z.object({
    kind: z.literal("album"),
    artistId: z.string().min(1),
    albumId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("albumTrack"),
    artistId: z.string().min(1),
    albumId: z.string().min(1),
    trackIndex: z.number().int().min(0),
  }),
]);

const legacyBody = z
  .object({ spotifyUrl: z.string().min(1, "spotifyUrl is required") })
  .transform((b) => ({ kind: "spotifyUrl" as const, spotifyUrl: b.spotifyUrl }));

export const createPlaylistSchema = z.object({
  body: z.union([discriminatedBody, legacyBody]),
});

// Schema for updating a playlist
export const updatePlaylistSchema = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
  body: z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    spotifyUrl: z.string().optional(),
    subscribed: z.boolean().optional(),
  }),
});

// Schema for playlist preview
export const playlistPreviewSchema = z.object({
  query: z.object({
    url: z.string().min(1, "url query parameter is required"),
  }),
});

export const playlistPreviewTracksSchema = z.object({
  query: z.object({
    url: z.string().min(1, "url query parameter is required"),
    offset: z.coerce.number().int().min(0).default(0),
    limit: z.coerce.number().int().min(1).max(100).default(100),
  }),
});

// Schema for playlist ID param
export const playlistIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
});
