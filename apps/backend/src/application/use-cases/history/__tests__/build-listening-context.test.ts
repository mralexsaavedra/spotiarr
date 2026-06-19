import type { TopArtistItem, TopTrackItem } from "@spotiarr/shared";
import { describe, expect, it } from "vitest";
import { buildListeningContext } from "../build-listening-context.use-case";

const makeTrack = (overrides: Partial<TopTrackItem> = {}): TopTrackItem => ({
  trackUrl: "https://example.com/track",
  trackName: "Song A",
  artist: "Artist A",
  album: null,
  albumCoverUrl: null,
  playCount: 5,
  lastPlayedAt: Date.now(),
  ...overrides,
});

const makeArtist = (overrides: Partial<TopArtistItem> = {}): TopArtistItem => ({
  artist: "Artist A",
  playCount: 5,
  lastPlayedAt: Date.now(),
  ...overrides,
});

describe("buildListeningContext", () => {
  describe("scope: tracks", () => {
    it("returns a string containing track names when scope is tracks", () => {
      const tracks = [makeTrack({ trackName: "Bohemian Rhapsody", artist: "Queen" })];
      const result = buildListeningContext(tracks, [], "tracks");
      expect(result).toContain("Bohemian Rhapsody");
    });

    it("does NOT include artist names from topArtists list when scope is tracks", () => {
      const tracks = [makeTrack({ trackName: "Song X", artist: "Band X" })];
      const artists = [makeArtist({ artist: "ArtistOnly" })];
      const result = buildListeningContext(tracks, artists, "tracks");
      expect(result).not.toContain("ArtistOnly");
    });

    it("returns empty string when tracks array is empty and scope is tracks", () => {
      const result = buildListeningContext([], [], "tracks");
      expect(result).toBe("");
    });
  });

  describe("scope: artists", () => {
    it("returns a string containing artist names when scope is artists", () => {
      const artists = [makeArtist({ artist: "The Beatles" })];
      const result = buildListeningContext([], artists, "artists");
      expect(result).toContain("The Beatles");
    });

    it("does NOT include track names when scope is artists", () => {
      const tracks = [makeTrack({ trackName: "Hidden Track" })];
      const artists = [makeArtist({ artist: "Artist B" })];
      const result = buildListeningContext(tracks, artists, "artists");
      expect(result).not.toContain("Hidden Track");
    });

    it("returns empty string when artists array is empty and scope is artists", () => {
      const result = buildListeningContext([], [], "artists");
      expect(result).toBe("");
    });
  });

  describe("scope: both", () => {
    it("includes both track names and artist names", () => {
      const tracks = [makeTrack({ trackName: "Hotel California", artist: "Eagles" })];
      const artists = [makeArtist({ artist: "Led Zeppelin" })];
      const result = buildListeningContext(tracks, artists, "both");
      expect(result).toContain("Hotel California");
      expect(result).toContain("Led Zeppelin");
    });

    it("returns empty string when both arrays are empty", () => {
      const result = buildListeningContext([], [], "both");
      expect(result).toBe("");
    });
  });

  describe("cap enforcement", () => {
    it("caps tracks at 15 items even when more are provided", () => {
      const tracks = Array.from({ length: 20 }, (_, i) =>
        makeTrack({ trackName: `Track ${i + 1}`, artist: `Artist ${i + 1}` }),
      );
      const result = buildListeningContext(tracks, [], "tracks");
      // Track 16-20 must NOT appear
      expect(result).not.toContain("Track 16");
      expect(result).not.toContain("Track 20");
      // Track 15 must appear
      expect(result).toContain("Track 15");
    });

    it("caps artists at 15 items even when more are provided", () => {
      const artists = Array.from({ length: 20 }, (_, i) =>
        makeArtist({ artist: `Artist ${i + 1}` }),
      );
      const result = buildListeningContext([], artists, "artists");
      expect(result).not.toContain("Artist 16");
      expect(result).not.toContain("Artist 20");
      expect(result).toContain("Artist 15");
    });
  });

  describe("CONFIRMED-3: oversized name truncation (prompt injection defense)", () => {
    it("truncates a trackName longer than 100 chars in the output", () => {
      const longName = "X".repeat(200);
      const track = makeTrack({ trackName: longName, artist: "Artist" });
      const result = buildListeningContext([track], [], "tracks");
      expect(result).not.toContain("X".repeat(101));
      // The truncated form (100 chars) must appear
      expect(result).toContain("X".repeat(100));
    });

    it("truncates an artist name longer than 100 chars in the track line", () => {
      const longArtist = "Y".repeat(200);
      const track = makeTrack({ trackName: "Song", artist: longArtist });
      const result = buildListeningContext([track], [], "tracks");
      expect(result).not.toContain("Y".repeat(101));
      expect(result).toContain("Y".repeat(100));
    });

    it("truncates an artist name longer than 100 chars in the artist list", () => {
      const longArtist = "Z".repeat(200);
      const artist = makeArtist({ artist: longArtist });
      const result = buildListeningContext([], [artist], "artists");
      expect(result).not.toContain("Z".repeat(101));
      expect(result).toContain("Z".repeat(100));
    });

    it("does not truncate names exactly at 100 chars", () => {
      const exactName = "A".repeat(100);
      const track = makeTrack({ trackName: exactName, artist: "Artist" });
      const result = buildListeningContext([track], [], "tracks");
      expect(result).toContain("A".repeat(100));
    });
  });

  describe("empty / absent scenarios", () => {
    it("returns empty string when both arrays empty regardless of scope", () => {
      expect(buildListeningContext([], [], "both")).toBe("");
      expect(buildListeningContext([], [], "tracks")).toBe("");
      expect(buildListeningContext([], [], "artists")).toBe("");
    });

    it("returns non-empty string when only artists provided and scope is both", () => {
      const artists = [makeArtist({ artist: "Radiohead" })];
      const result = buildListeningContext([], artists, "both");
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("Radiohead");
    });

    it("returns non-empty string when only tracks provided and scope is both", () => {
      const tracks = [makeTrack({ trackName: "OK Computer", artist: "Radiohead" })];
      const result = buildListeningContext(tracks, [], "both");
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("OK Computer");
    });
  });
});
