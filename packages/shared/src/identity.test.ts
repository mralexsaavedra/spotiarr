/**
 * Unit tests for URL identity helpers.
 * These tests document the expected behaviour of isDeezerUrl and extractDeezerTrackId.
 * They are intended to run inside a vitest-enabled workspace (e.g. backend or frontend)
 * that resolves @spotiarr/shared to the source files via a path alias.
 *
 * To run these in the backend test suite, the vitest.config.ts include pattern would need
 * to extend beyond src/**. For now, the canonical validation of these helpers is covered
 * by the artwork.service.test.ts ATW cases in apps/backend.
 */
import { describe, expect, it } from "vitest";
import { extractDeezerTrackId, isDeezerUrl } from "./identity.js";

describe("isDeezerUrl", () => {
  it("returns true for api.deezer.com track URLs", () => {
    expect(isDeezerUrl("https://api.deezer.com/track/123")).toBe(true);
  });

  it("returns true for www.deezer.com URLs", () => {
    expect(isDeezerUrl("https://www.deezer.com/track/456")).toBe(true);
  });

  it("returns false for Spotify URLs", () => {
    expect(isDeezerUrl("https://open.spotify.com/track/abc")).toBe(false);
  });

  it("returns false for arbitrary strings", () => {
    expect(isDeezerUrl("not-a-url")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isDeezerUrl(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDeezerUrl(undefined)).toBe(false);
  });
});

describe("extractDeezerTrackId", () => {
  it("extracts the numeric track id from a Deezer track URL", () => {
    expect(extractDeezerTrackId("https://api.deezer.com/track/12345")).toBe("12345");
  });

  it("returns null for a URL without a track segment", () => {
    expect(extractDeezerTrackId("https://api.deezer.com/album/789")).toBeNull();
  });

  it("returns null for a Spotify URL", () => {
    expect(extractDeezerTrackId("https://open.spotify.com/track/abc")).toBeNull();
  });
});
