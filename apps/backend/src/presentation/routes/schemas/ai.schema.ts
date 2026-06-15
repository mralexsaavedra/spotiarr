import { z } from "zod";

export const generateAiPlaylistSchema = z.object({
  body: z.object({
    prompt: z
      .string()
      .trim()
      .min(1, "Prompt must not be empty")
      .max(500, "Prompt must not exceed 500 characters"),
  }),
});

export const listModelsSchema = z.object({
  body: z
    .object({
      provider: z.string().optional(),
      baseURL: z.string().optional(),
      apiKey: z.string().optional(),
    })
    .optional(),
});
