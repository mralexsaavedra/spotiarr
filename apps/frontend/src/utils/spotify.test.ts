import { describe, expect, it } from "vitest";
import { getSpotifyIdFromUrl, isSpotifyUrl, mapApiError, normalizeSpotifyUrl } from "./spotify";

describe("normalizeSpotifyUrl", () => {
  it("normalizes a valid open.spotify.com URL", () => {
    expect(normalizeSpotifyUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")).toBe(
      "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    );
  });

  it("normalizes a URL with extra path segments", () => {
    expect(
      normalizeSpotifyUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M/tracks"),
    ).toBe("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M");
  });

  it("normalizes an album URL", () => {
    expect(normalizeSpotifyUrl("https://open.spotify.com/album/4yP0hdKOZPNsh8gydrB7Jb")).toBe(
      "https://open.spotify.com/album/4yP0hdKOZPNsh8gydrB7Jb",
    );
  });

  it("rejects non-spotify host", () => {
    expect(normalizeSpotifyUrl("https://example.com/playlist/abc")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(normalizeSpotifyUrl("  ")).toBeNull();
    expect(normalizeSpotifyUrl("")).toBeNull();
  });

  it("rejects malformed URL", () => {
    expect(normalizeSpotifyUrl("not-a-url")).toBeNull();
  });

  it("rejects URL with missing ID", () => {
    expect(normalizeSpotifyUrl("https://open.spotify.com/playlist/")).toBeNull();
  });
});

describe("isSpotifyUrl", () => {
  it("returns true for open.spotify.com", () => {
    expect(isSpotifyUrl("https://open.spotify.com/playlist/abc")).toBe(true);
  });

  it("returns true for spotify.com", () => {
    expect(isSpotifyUrl("https://spotify.com/track/abc")).toBe(true);
  });

  it("returns true for spoti.fi", () => {
    expect(isSpotifyUrl("https://spoti.fi/abc")).toBe(true);
  });

  it("returns false for non-spotify URLs", () => {
    expect(isSpotifyUrl("https://youtube.com/watch")).toBe(false);
  });

  it("returns false for null/undefined/empty", () => {
    expect(isSpotifyUrl(null)).toBe(false);
    expect(isSpotifyUrl(undefined)).toBe(false);
    expect(isSpotifyUrl("")).toBe(false);
  });
});

describe("getSpotifyIdFromUrl", () => {
  it("extracts the ID from a standard URL", () => {
    expect(getSpotifyIdFromUrl("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")).toBe(
      "37i9dQZF1DXcBWIGoYBM5M",
    );
  });

  it("returns null for malformed URLs", () => {
    expect(getSpotifyIdFromUrl("not-a-url")).toBeNull();
  });

  it("returns null when path has fewer than 3 segments", () => {
    expect(getSpotifyIdFromUrl("https://open.spotify.com/playlist")).toBeNull();
  });
});

describe("mapApiError", () => {
  it("maps missing_user_access_token from code", () => {
    const error = new Error("something");
    (error as { code?: string }).code = "missing_user_access_token";
    expect(mapApiError(error, "spotify_rate_limited")).toBe("missing_user_access_token");
  });

  it("maps missing_user_access_token from message", () => {
    const error = new Error("missing_user_access_token");
    expect(mapApiError(error, "spotify_rate_limited")).toBe("missing_user_access_token");
  });

  it("maps spotify_rate_limited from code", () => {
    const error = new Error("rate limited");
    (error as { code?: string }).code = "spotify_rate_limited";
    expect(mapApiError(error, "missing_user_access_token")).toBe("spotify_rate_limited");
  });

  it("returns null for non-Error input", () => {
    expect(mapApiError("string error", "spotify_rate_limited")).toBeNull();
  });

  it("returns fallback for unmatched errors", () => {
    const error = new Error("unknown");
    expect(mapApiError(error, "spotify_rate_limited")).toBe("spotify_rate_limited");
  });
});
