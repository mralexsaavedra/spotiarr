import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { describe, expect, it } from "vitest";
import type { Playlist, Track } from "@/types";
import { buildZeroStats, calculatePlaylistStats, formatPlaylistTitle } from "./playlist";

const makeTrack = (status: TrackStatusEnum, overrides: Partial<Track> = {}): Track => ({
  id: "t1",
  name: "Song",
  artist: "Artist",
  album: "Album",
  durationMs: 180000,
  status,
  ...overrides,
});

describe("buildZeroStats", () => {
  it("returns all-zero stats for a given total count", () => {
    const stats = buildZeroStats(5);
    expect(stats).toEqual({
      completedCount: 0,
      downloadingCount: 0,
      searchingCount: 0,
      queuedCount: 0,
      activeCount: 0,
      errorCount: 0,
      totalCount: 5,
      progress: 0,
      isDownloading: false,
      hasErrors: false,
      isCompleted: false,
    });
  });
});

describe("calculatePlaylistStats", () => {
  it("handles an empty track list", () => {
    const playlist: Playlist = {
      id: "p1",
      name: "Test",
      spotifyUrl: "https://open.spotify.com/playlist/s1",
      type: PlaylistTypeEnum.Playlist,
      tracks: [],
    };
    const stats = calculatePlaylistStats(playlist);
    expect(stats.totalCount).toBe(0);
    expect(stats.progress).toBe(0);
    expect(stats.isCompleted).toBe(false);
    expect(stats.isDownloading).toBe(false);
    expect(stats.hasErrors).toBe(false);
  });

  it("calculates progress and flags for mixed statuses", () => {
    const playlist: Playlist = {
      id: "p1",
      name: "Test",
      spotifyUrl: "https://open.spotify.com/playlist/s1",
      type: PlaylistTypeEnum.Playlist,
      tracks: [
        makeTrack(TrackStatusEnum.Completed),
        makeTrack(TrackStatusEnum.Downloading),
        makeTrack(TrackStatusEnum.Searching),
        makeTrack(TrackStatusEnum.Queued),
        makeTrack(TrackStatusEnum.Error),
      ],
    };
    const stats = calculatePlaylistStats(playlist);
    expect(stats.completedCount).toBe(1);
    expect(stats.downloadingCount).toBe(1);
    expect(stats.searchingCount).toBe(1);
    expect(stats.queuedCount).toBe(1);
    expect(stats.errorCount).toBe(1);
    expect(stats.activeCount).toBe(3);
    expect(stats.totalCount).toBe(5);
    expect(stats.progress).toBe(20);
    expect(stats.isDownloading).toBe(true);
    expect(stats.hasErrors).toBe(true);
    expect(stats.isCompleted).toBe(false);
  });

  it("marks completed when all tracks are completed", () => {
    const playlist: Playlist = {
      id: "p1",
      name: "Test",
      spotifyUrl: "https://open.spotify.com/playlist/s1",
      type: PlaylistTypeEnum.Playlist,
      tracks: [makeTrack(TrackStatusEnum.Completed), makeTrack(TrackStatusEnum.Completed)],
    };
    const stats = calculatePlaylistStats(playlist);
    expect(stats.isCompleted).toBe(true);
    expect(stats.progress).toBe(100);
    expect(stats.hasErrors).toBe(false);
    expect(stats.isDownloading).toBe(false);
  });
});

describe("formatPlaylistTitle", () => {
  it("returns 'Unnamed Playlist' for empty title", () => {
    expect(formatPlaylistTitle("", "playlist", [])).toBe("Unnamed Playlist");
  });

  it("returns raw title for plain playlist type", () => {
    expect(formatPlaylistTitle("My Playlist", "playlist", [])).toBe("My Playlist");
  });

  it("extracts album name from first track for album type", () => {
    const tracks = [makeTrack(TrackStatusEnum.New, { album: "Dark Side" })];
    expect(formatPlaylistTitle("Artist - Dark Side", "album", tracks)).toBe("Dark Side");
  });

  it("falls back to splitting raw title for album when no track album", () => {
    expect(formatPlaylistTitle("Artist - Dark Side", "album", [])).toBe("Dark Side");
  });

  it("extracts track name from first track for track type", () => {
    const tracks = [makeTrack(TrackStatusEnum.New, { name: "Money" })];
    expect(formatPlaylistTitle("Artist - Money", "track", tracks)).toBe("Money");
  });

  it("returns raw title when splitting yields no dash for track type", () => {
    expect(formatPlaylistTitle("Single", "track", [])).toBe("Single");
  });
});
