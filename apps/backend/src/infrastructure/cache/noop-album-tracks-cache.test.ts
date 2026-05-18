import type { NormalizedTrack } from "@spotiarr/shared";
import { describe, it, expect } from "vitest";
import { NoopAlbumTracksCache } from "./noop-album-tracks-cache";

function makeNormalizedTrack(overrides: Partial<NormalizedTrack> = {}): NormalizedTrack {
  return {
    name: "Test Track",
    artist: "Test Artist",
    album: "Test Album",
    trackNumber: 1,
    discNumber: 1,
    durationMs: 180000,
    artists: [{ name: "Test Artist", url: undefined }],
    ...overrides,
  };
}

describe("NoopAlbumTracksCache", () => {
  const cache = new NoopAlbumTracksCache();

  describe("get", () => {
    it("always returns null (cache miss)", async () => {
      const result = await cache.get("artist-1", "album-1");
      expect(result).toBeNull();
    });

    it("returns null regardless of arguments", async () => {
      const result = await cache.get("any-artist", "any-album");
      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("resolves without error", async () => {
      const tracks = [makeNormalizedTrack()];
      await expect(cache.set("artist-1", "album-1", tracks)).resolves.toBeUndefined();
    });

    it("resolves without error with ttlSeconds provided", async () => {
      const tracks = [makeNormalizedTrack()];
      await expect(cache.set("artist-1", "album-1", tracks, 300)).resolves.toBeUndefined();
    });

    it("subsequent get after set still returns null (no-op)", async () => {
      const tracks = [makeNormalizedTrack()];
      await cache.set("artist-1", "album-1", tracks);
      const result = await cache.get("artist-1", "album-1");
      expect(result).toBeNull();
    });
  });
});
