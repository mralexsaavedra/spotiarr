import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { historyService } from "@/services/history.service";
import { queryKeys } from "../queryKeys";
import { useRecentPlaysQuery } from "./useRecentPlaysQuery";

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

describe("useRecentPlaysQuery", () => {
  it("calls historyService.getRecentPlays with default limit 20 and returns resolved data", async () => {
    const data = [
      {
        trackId: "t-1",
        trackUrl: "https://example.com/track1.mp3",
        trackName: "Track One",
        artist: "Artist A",
        album: null,
        playedAt: 1700000000000,
      },
    ];
    vi.mocked(historyService.getRecentPlays).mockResolvedValueOnce(data);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { result } = renderHook(() => useRecentPlaysQuery(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(historyService.getRecentPlays).toHaveBeenCalledWith(20);
    expect(result.current.data).toBe(data);
    expect(queryClient.getQueryData(queryKeys.historyRecentPlays(20))).toBe(data);
  });

  it("uses distinct cache keys for distinct limits", async () => {
    vi.mocked(historyService.getRecentPlays).mockResolvedValue([]);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result: r10 } = renderHook(() => useRecentPlaysQuery(10), { wrapper });
    await waitFor(() => expect(r10.current.isSuccess).toBe(true));

    expect(queryKeys.historyRecentPlays(10)).not.toEqual(queryKeys.historyRecentPlays(20));
  });

  it("returns an empty array when there are no recent plays", async () => {
    vi.mocked(historyService.getRecentPlays).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useRecentPlaysQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it("data shape: each item has trackName, artist, playedAt", async () => {
    const item = {
      trackId: null,
      trackUrl: null,
      trackName: "Track Two",
      artist: "Artist B",
      album: null,
      playedAt: 1700000001000,
    };
    vi.mocked(historyService.getRecentPlays).mockResolvedValueOnce([item]);

    const { result } = renderHook(() => useRecentPlaysQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const first = result.current.data![0];
    expect(first.trackName).toBe("Track Two");
    expect(first.artist).toBe("Artist B");
    expect(first.playedAt).toBe(1700000001000);
  });
});
