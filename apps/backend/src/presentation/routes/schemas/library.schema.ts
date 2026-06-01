import { z } from "zod";

export const libraryImageQuerySchema = z.object({
  path: z.string().min(1, "path query parameter is required"),
});

export const libraryImageRequestSchema = z.object({
  query: libraryImageQuerySchema,
});

export const libraryAudioQuerySchema = z.object({
  path: z.string().min(1, "path query parameter is required"),
});

export const libraryAudioRequestSchema = z.object({
  query: libraryAudioQuerySchema,
});
