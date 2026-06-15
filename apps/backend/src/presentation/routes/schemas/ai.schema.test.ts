import { describe, it, expect } from "vitest";
import { generateAiPlaylistSchema, listModelsSchema } from "./ai.schema";

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

describe("listModelsSchema", () => {
  it("accepts empty body", () => {
    const result = listModelsSchema.safeParse({ body: {} });
    expect(result.success).toBe(true);
  });

  it("accepts body with all optional fields", () => {
    const result = listModelsSchema.safeParse({
      body: { provider: "openai", baseURL: "https://api.openai.com/v1", apiKey: "sk-test" },
    });
    expect(result.success).toBe(true);
  });

  it("accepts body with only provider", () => {
    const result = listModelsSchema.safeParse({ body: { provider: "ollama" } });
    expect(result.success).toBe(true);
  });

  it("accepts body with only apiKey", () => {
    const result = listModelsSchema.safeParse({ body: { apiKey: "sk-test" } });
    expect(result.success).toBe(true);
  });

  it("accepts missing body (all fields optional)", () => {
    const result = listModelsSchema.safeParse({ body: undefined });
    expect(result.success).toBe(true);
  });
});
