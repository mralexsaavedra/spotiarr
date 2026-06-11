import type { DownloadHistoryItem } from "@spotiarr/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HistoryUseCases } from "./history.use-cases";

function makeItem(overrides: Partial<DownloadHistoryItem> = {}): DownloadHistoryItem {
  return {
    id: "h-1",
    playlistId: "pl-1",
    playlistName: "Playlist",
    playlistSpotifyUrl: "https://open.spotify.com/playlist/abc",
    trackId: "t-1",
    trackName: "Song",
    artist: "Artist",
    album: "Album",
    trackUrl: null,
    completedAt: 1000,
    ...overrides,
  };
}

describe("HistoryUseCases.getRecentDownloads", () => {
  let repository: { findAll: ReturnType<typeof vi.fn> };
  let useCases: HistoryUseCases;

  beforeEach(() => {
    repository = { findAll: vi.fn() };
    useCases = new HistoryUseCases({ repository: repository as never });
  });

  it("dedups entries that share the same playlist id and counts unique tracks", async () => {
    repository.findAll.mockResolvedValue([
      makeItem({ id: "h-1", trackId: "t-1", completedAt: 1000 }),
      makeItem({ id: "h-2", trackId: "t-2", completedAt: 2000 }),
      makeItem({ id: "h-3", trackId: "t-1", completedAt: 1500 }), // duplicate track
    ]);

    const result = await useCases.getRecentDownloads();

    expect(result).toHaveLength(1);
    expect(result[0].trackCount).toBe(2);
    expect(result[0].lastCompletedAt).toBe(2000);
  });

  it("normalizes the Spotify URL by stripping the /intl-xx/ segment when merging", async () => {
    repository.findAll.mockResolvedValue([
      makeItem({
        id: "h-1",
        playlistId: null,
        trackId: "t-1",
        playlistSpotifyUrl: "https://open.spotify.com/playlist/abc",
      }),
      makeItem({
        id: "h-2",
        playlistId: null,
        trackId: "t-2",
        playlistSpotifyUrl: "https://open.spotify.com/intl-es/playlist/abc",
      }),
    ]);

    const result = await useCases.getRecentDownloads();

    expect(result).toHaveLength(1);
    expect(result[0].trackCount).toBe(2);
    expect(result[0].playlistSpotifyUrl).toBe("https://open.spotify.com/playlist/abc");
  });

  it("merges cross-run entries that share a url but where only one carries the id", async () => {
    repository.findAll.mockResolvedValue([
      makeItem({
        id: "h-1",
        playlistId: null,
        trackId: "t-1",
        playlistSpotifyUrl: "https://open.spotify.com/playlist/abc",
      }),
      makeItem({
        id: "h-2",
        playlistId: "pl-1",
        trackId: "t-2",
        playlistSpotifyUrl: "https://open.spotify.com/playlist/abc",
      }),
    ]);

    const result = await useCases.getRecentDownloads();

    expect(result).toHaveLength(1);
    expect(result[0].trackCount).toBe(2);
    // Enrichment backfills the id discovered on the later entry.
    expect(result[0].playlistId).toBe("pl-1");
  });

  it("keeps the playlist name from the most recently completed entry", async () => {
    repository.findAll.mockResolvedValue([
      makeItem({ id: "h-1", playlistName: "Old Name", completedAt: 1000 }),
      makeItem({ id: "h-2", playlistName: "New Name", completedAt: 5000 }),
    ]);

    const result = await useCases.getRecentDownloads();

    expect(result[0].playlistName).toBe("New Name");
  });

  it("sorts the resulting playlists by lastCompletedAt descending", async () => {
    repository.findAll.mockResolvedValue([
      makeItem({ id: "h-1", playlistId: "pl-a", playlistSpotifyUrl: null, completedAt: 1000 }),
      makeItem({ id: "h-2", playlistId: "pl-b", playlistSpotifyUrl: null, completedAt: 3000 }),
      makeItem({ id: "h-3", playlistId: "pl-c", playlistSpotifyUrl: null, completedAt: 2000 }),
    ]);

    const result = await useCases.getRecentDownloads();

    expect(result.map((p) => p.playlistId)).toEqual(["pl-b", "pl-c", "pl-a"]);
  });

  it("groups identifier-less entries into a single fallback bucket within the same tick", async () => {
    // With no playlistId and no url, the key falls back to `unknown-${Date.now()}`.
    // Pin the clock so the fallback key is stable and the merge is deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_000_000);
    repository.findAll.mockResolvedValue([
      makeItem({ id: "h-1", playlistId: null, playlistSpotifyUrl: null, trackId: "t-1" }),
      makeItem({ id: "h-2", playlistId: null, playlistSpotifyUrl: null, trackId: "t-2" }),
    ]);

    const result = await useCases.getRecentDownloads();
    vi.useRealTimers();

    expect(result).toHaveLength(1);
    expect(result[0].trackCount).toBe(2);
    expect(result[0].playlistId).toBeNull();
  });

  it("forwards the limit to the repository", async () => {
    repository.findAll.mockResolvedValue([]);
    await useCases.getRecentDownloads(50);
    expect(repository.findAll).toHaveBeenCalledWith(50);
  });
});
