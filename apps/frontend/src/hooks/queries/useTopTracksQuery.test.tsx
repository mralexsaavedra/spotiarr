import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { historyService } from "@/services/history.service";
import { queryKeys } from "../queryKeys";
import { useTopTracksQuery } from "./useTopTracksQuery";

vi.mock("@/services/history.service", () => ({
  historyService: {
    getTopTracks: vi.fn(),
    getTopArtists: vi.fn(),
    getRecentPlays: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useTopTracksQuery", () => {
  it("calls historyService.getTopTracks with default limit 10 and returns resolved data", async () => {
    const data = [
      {
        trackUrl: "https://example.com/track1.mp3",
        trackName: "Track One",
        artist: "Artist A",
        album: null,
        albumCoverUrl: null,
        playCount: 5,
        lastPlayedAt: 1700000000000,
      },
    ];
    vi.mocked(historyService.getTopTracks).mockResolvedValueOnce(data);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useTopTracksQuery(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(historyService.getTopTracks).toHaveBeenCalledWith(10);
    expect(result.current.data).toBe(data);
    expect(queryClient.getQueryData(queryKeys.historyTopTracks(10))).toBe(data);
  });

  it("uses distinct cache keys for distinct limits", async () => {
    vi.mocked(historyService.getTopTracks).mockResolvedValue([]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result: r5 } = renderHook(() => useTopTracksQuery(5), { wrapper });
    await waitFor(() => expect(r5.current.isSuccess).toBe(true));

    expect(queryKeys.historyTopTracks(5)).not.toEqual(queryKeys.historyTopTracks(10));
  });

  it("returns an empty array when there are no top tracks", async () => {
    vi.mocked(historyService.getTopTracks).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useTopTracksQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it("data shape: each item has trackName, artist, playCount", async () => {
    const item = {
      trackUrl: null,
      trackName: "Track Two",
      artist: "Artist B",
      album: null,
      albumCoverUrl: null,
      playCount: 3,
      lastPlayedAt: 1700000001000,
    };
    vi.mocked(historyService.getTopTracks).mockResolvedValueOnce([item]);

    const { result } = renderHook(() => useTopTracksQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const first = result.current.data![0];
    expect(first.trackName).toBe("Track Two");
    expect(first.artist).toBe("Artist B");
    expect(first.playCount).toBe(3);
  });
});
