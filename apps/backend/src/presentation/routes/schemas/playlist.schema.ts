import { z } from "zod";

// Schema for creating a playlist
export const createPlaylistSchema = z.object({
  body: z.object({
    spotifyUrl: z.string().min(1, "spotifyUrl is required"),
    name: z.string().optional(),
    type: z.string().optional(),
    subscribed: z.boolean().optional(),
  }),
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

// Schema for playlist ID param
export const playlistIdSchema = z.object({
  params: z.object({
    id: z.string().min(1, "id is required"),
  }),
});
