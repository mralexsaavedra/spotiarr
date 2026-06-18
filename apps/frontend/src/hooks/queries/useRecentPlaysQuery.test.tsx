import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { historyService } from "@/services/history.service";
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
  it("calls historyService.getRecentPlays and returns resolved data", async () => {
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

    const { result } = renderHook(() => useRecentPlaysQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(historyService.getRecentPlays).toHaveBeenCalledWith(20);
    expect(result.current.data).toBe(data);
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
