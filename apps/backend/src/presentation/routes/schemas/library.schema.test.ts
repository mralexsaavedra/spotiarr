import { describe, it, expect } from "vitest";
import {
  libraryAudioQuerySchema,
  libraryAudioRequestSchema,
  libraryImageQuerySchema,
  libraryImageRequestSchema,
} from "./library.schema";

describe("libraryImageQuerySchema", () => {
  it("accepts a valid non-empty path", () => {
    const result = libraryImageQuerySchema.safeParse({ path: "/covers/img.jpg" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.path).toBe("/covers/img.jpg");
  });

  it("rejects when path is missing", () => {
    const result = libraryImageQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects when path is an empty string", () => {
    const result = libraryImageQuerySchema.safeParse({ path: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.path).toContain("path query parameter is required");
    }
  });

  it("rejects when path is not a string", () => {
    const result = libraryImageQuerySchema.safeParse({ path: 123 });
    expect(result.success).toBe(false);
  });
});

describe("libraryImageRequestSchema", () => {
  it("accepts a valid query wrapper", () => {
    const result = libraryImageRequestSchema.safeParse({ query: { path: "/img.jpg" } });
    expect(result.success).toBe(true);
  });

  it("rejects when the nested query.path is missing", () => {
    const result = libraryImageRequestSchema.safeParse({ query: {} });
    expect(result.success).toBe(false);
  });

  it("rejects when the query key itself is missing", () => {
    const result = libraryImageRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("libraryAudioQuerySchema", () => {
  it("accepts a valid non-empty path", () => {
    const result = libraryAudioQuerySchema.safeParse({ path: "/music/song.mp3" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.path).toBe("/music/song.mp3");
  });

  it("rejects when path is missing", () => {
    const result = libraryAudioQuerySchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects when path is an empty string", () => {
    const result = libraryAudioQuerySchema.safeParse({ path: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.path).toContain("path query parameter is required");
    }
  });

  it("rejects when path is not a string", () => {
    const result = libraryAudioQuerySchema.safeParse({ path: null });
    expect(result.success).toBe(false);
  });
});

describe("libraryAudioRequestSchema", () => {
  it("accepts a valid query wrapper", () => {
    const result = libraryAudioRequestSchema.safeParse({ query: { path: "/song.mp3" } });
    expect(result.success).toBe(true);
  });

  it("rejects when the nested query.path is missing", () => {
    const result = libraryAudioRequestSchema.safeParse({ query: {} });
    expect(result.success).toBe(false);
  });

  it("rejects when the query key itself is missing", () => {
    const result = libraryAudioRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
