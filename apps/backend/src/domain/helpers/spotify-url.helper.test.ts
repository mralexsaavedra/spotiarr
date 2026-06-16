import { describe, expect, it } from "vitest";
import { AppError } from "@/domain/errors/app-error";
import { SpotifyUrlHelper, SpotifyUrlType } from "./spotify-url.helper";

const PLAYLIST_URL = "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M";
const TRACK_URL = "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC";
const ALBUM_URL = "https://open.spotify.com/album/6dVIqQ8qmQ5GBnJ9shOYGE";
const ARTIST_URL = "https://open.spotify.com/artist/06HL4z0CvFAxyc27GXpf02";

describe("SpotifyUrlHelper.getUrlType", () => {
  it("returns Playlist for a playlist URL", () => {
    expect(SpotifyUrlHelper.getUrlType(PLAYLIST_URL)).toBe(SpotifyUrlType.Playlist);
  });

  it("returns Track for a track URL", () => {
    expect(SpotifyUrlHelper.getUrlType(TRACK_URL)).toBe(SpotifyUrlType.Track);
  });

  it("returns Album for an album URL", () => {
    expect(SpotifyUrlHelper.getUrlType(ALBUM_URL)).toBe(SpotifyUrlType.Album);
  });

  it("returns Artist for an artist URL", () => {
    expect(SpotifyUrlHelper.getUrlType(ARTIST_URL)).toBe(SpotifyUrlType.Artist);
  });

  it("throws AppError for empty string", () => {
    expect(() => SpotifyUrlHelper.getUrlType("")).toThrow(AppError);
  });

  it("throws AppError for a non-Spotify URL", () => {
    expect(() => SpotifyUrlHelper.getUrlType("https://youtube.com/watch?v=abc")).toThrow(AppError);
  });

  it("throws AppError for a Spotify URL with no recognized path segment", () => {
    expect(() => SpotifyUrlHelper.getUrlType("https://open.spotify.com/user/abc")).toThrow(
      AppError,
    );
  });
});

describe("SpotifyUrlHelper.isSpotifyUrl", () => {
  it("returns true for open.spotify.com", () => {
    expect(SpotifyUrlHelper.isSpotifyUrl("https://open.spotify.com/playlist/abc")).toBe(true);
  });

  it("returns true for spotify.com", () => {
    expect(SpotifyUrlHelper.isSpotifyUrl("https://spotify.com/playlist/abc")).toBe(true);
  });

  it("returns true for spoti.fi", () => {
    expect(SpotifyUrlHelper.isSpotifyUrl("https://spoti.fi/3abc123")).toBe(true);
  });

  it("returns false for a non-Spotify URL", () => {
    expect(SpotifyUrlHelper.isSpotifyUrl("https://youtube.com/watch?v=abc")).toBe(false);
  });

  it("returns false for an invalid URL string", () => {
    expect(SpotifyUrlHelper.isSpotifyUrl("not-a-url")).toBe(false);
  });
});

describe("SpotifyUrlHelper.isPlaylist / isAlbum / isTrack", () => {
  it("isPlaylist returns true for a playlist URL", () => {
    expect(SpotifyUrlHelper.isPlaylist(PLAYLIST_URL)).toBe(true);
  });

  it("isPlaylist returns false for a track URL", () => {
    expect(SpotifyUrlHelper.isPlaylist(TRACK_URL)).toBe(false);
  });

  it("isAlbum returns true for an album URL", () => {
    expect(SpotifyUrlHelper.isAlbum(ALBUM_URL)).toBe(true);
  });

  it("isAlbum returns false for a playlist URL", () => {
    expect(SpotifyUrlHelper.isAlbum(PLAYLIST_URL)).toBe(false);
  });

  it("isTrack returns true for a track URL", () => {
    expect(SpotifyUrlHelper.isTrack(TRACK_URL)).toBe(true);
  });

  it("isTrack returns false for an album URL", () => {
    expect(SpotifyUrlHelper.isTrack(ALBUM_URL)).toBe(false);
  });
});

describe("SpotifyUrlHelper.extractId", () => {
  it("extracts the ID from a playlist URL", () => {
    expect(SpotifyUrlHelper.extractId(PLAYLIST_URL)).toBe("37i9dQZF1DXcBWIGoYBM5M");
  });

  it("extracts the ID from a track URL", () => {
    expect(SpotifyUrlHelper.extractId(TRACK_URL)).toBe("4uLU6hMCjMI75M1A2tKUQC");
  });

  it("extracts the ID from an album URL", () => {
    expect(SpotifyUrlHelper.extractId(ALBUM_URL)).toBe("6dVIqQ8qmQ5GBnJ9shOYGE");
  });

  it("extracts the ID from an artist URL", () => {
    expect(SpotifyUrlHelper.extractId(ARTIST_URL)).toBe("06HL4z0CvFAxyc27GXpf02");
  });

  it("throws AppError when no ID pattern found", () => {
    expect(() => SpotifyUrlHelper.extractId("https://open.spotify.com/")).toThrow(AppError);
  });
});
