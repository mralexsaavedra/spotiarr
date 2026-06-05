import { describe, it, expect } from "vitest";
import { createPlaylistSchema } from "./playlist.schema";

describe("createPlaylistSchema — playlistTrack variant", () => {
  it("parses a valid playlistTrack body", () => {
    const result = createPlaylistSchema.safeParse({
      body: {
        kind: "playlistTrack",
        parentSpotifyUrl: "https://open.spotify.com/playlist/abc",
        trackUrl: "https://open.spotify.com/track/xyz",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toMatchObject({
        kind: "playlistTrack",
        parentSpotifyUrl: "https://open.spotify.com/playlist/abc",
        trackUrl: "https://open.spotify.com/track/xyz",
      });
    }
  });

  it("rejects playlistTrack body missing parentSpotifyUrl", () => {
    const result = createPlaylistSchema.safeParse({
      body: {
        kind: "playlistTrack",
        trackUrl: "https://open.spotify.com/track/xyz",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects playlistTrack body missing trackUrl", () => {
    const result = createPlaylistSchema.safeParse({
      body: {
        kind: "playlistTrack",
        parentSpotifyUrl: "https://open.spotify.com/playlist/abc",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects playlistTrack body with empty string for parentSpotifyUrl", () => {
    const result = createPlaylistSchema.safeParse({
      body: {
        kind: "playlistTrack",
        parentSpotifyUrl: "",
        trackUrl: "https://open.spotify.com/track/xyz",
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects playlistTrack body with empty string for trackUrl", () => {
    const result = createPlaylistSchema.safeParse({
      body: {
        kind: "playlistTrack",
        parentSpotifyUrl: "https://open.spotify.com/playlist/abc",
        trackUrl: "",
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("createPlaylistSchema — deezerTrack variant", () => {
  it("parses a valid deezerTrack body", () => {
    const result = createPlaylistSchema.safeParse({
      body: {
        kind: "deezerTrack",
        deezerTrackId: "12345",
        deezerAlbumId: "456",
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body).toMatchObject({
        kind: "deezerTrack",
        deezerTrackId: "12345",
        deezerAlbumId: "456",
      });
    }
  });
});
