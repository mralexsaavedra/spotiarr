import { describe, it, expect } from "vitest";
import { isSpotifyAlbumId, isDeezerAlbumId, isMusicBrainzId } from "./album-id.utils";

describe("isSpotifyAlbumId", () => {
  it("returns true for a valid 22-character alphanumeric Spotify ID", () => {
    expect(isSpotifyAlbumId("4aawyAB9vmqN3uQ7FjRGTy")).toBe(true);
  });

  it("returns false for a numeric-only string (Deezer ID shape)", () => {
    expect(isSpotifyAlbumId("123456789")).toBe(false);
  });

  it("returns false for a UUID (MusicBrainz ID shape)", () => {
    expect(isSpotifyAlbumId("550e8400-e29b-41d4-a716-446655440000")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isSpotifyAlbumId("")).toBe(false);
  });

  it("returns false for a 21-character string (too short)", () => {
    expect(isSpotifyAlbumId("4aawyAB9vmqN3uQ7FjRGT")).toBe(false);
  });

  it("returns false for a 23-character string (too long)", () => {
    expect(isSpotifyAlbumId("4aawyAB9vmqN3uQ7FjRGTyx")).toBe(false);
  });
});

describe("isDeezerAlbumId", () => {
  it("returns true for a valid numeric-only Deezer ID", () => {
    expect(isDeezerAlbumId("302127")).toBe(true);
  });

  it("returns false for a Spotify-shaped ID (alphanumeric)", () => {
    expect(isDeezerAlbumId("4aawyAB9vmqN3uQ7FjRGTy")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isDeezerAlbumId("")).toBe(false);
  });
});

describe("isMusicBrainzId", () => {
  it("returns true for a valid lowercase UUID", () => {
    expect(isMusicBrainzId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("returns true for a valid mixed-case UUID", () => {
    expect(isMusicBrainzId("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("returns false for an empty string", () => {
    expect(isMusicBrainzId("")).toBe(false);
  });

  it("returns false for a partial UUID (missing last segment)", () => {
    expect(isMusicBrainzId("550e8400-e29b-41d4-a716")).toBe(false);
  });

  it("returns false for a numeric-only string", () => {
    expect(isMusicBrainzId("302127")).toBe(false);
  });
});
