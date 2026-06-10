import { describe, it, expect } from "vitest";
import { generateAiPlaylistSchema } from "./ai.schema";

describe("generateAiPlaylistSchema", () => {
  it("accepts a valid prompt", () => {
    const result = generateAiPlaylistSchema.safeParse({ body: { prompt: "upbeat 90s rock" } });
    expect(result.success).toBe(true);
  });

  it("rejects an empty prompt", () => {
    const result = generateAiPlaylistSchema.safeParse({ body: { prompt: "" } });
    expect(result.success).toBe(false);
  });

  it("rejects a whitespace-only prompt", () => {
    const result = generateAiPlaylistSchema.safeParse({ body: { prompt: "   " } });
    expect(result.success).toBe(false);
  });

  it("rejects a prompt exceeding 500 characters", () => {
    const result = generateAiPlaylistSchema.safeParse({ body: { prompt: "a".repeat(501) } });
    expect(result.success).toBe(false);
  });

  it("accepts a prompt of exactly 500 characters", () => {
    const result = generateAiPlaylistSchema.safeParse({ body: { prompt: "a".repeat(500) } });
    expect(result.success).toBe(true);
  });

  it("trims whitespace from the prompt", () => {
    const result = generateAiPlaylistSchema.safeParse({ body: { prompt: "  jazz  " } });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.prompt).toBe("jazz");
    }
  });

  it("rejects missing prompt field", () => {
    const result = generateAiPlaylistSchema.safeParse({ body: {} });
    expect(result.success).toBe(false);
  });
});
