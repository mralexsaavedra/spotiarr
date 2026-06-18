import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { historyService } from "@/services/history.service";
import { useTopArtistsQuery } from "./useTopArtistsQuery";

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

describe("useTopArtistsQuery", () => {
  it("calls historyService.getTopArtists and returns resolved data", async () => {
    const data = [
      {
        artist: "Artist A",
        playCount: 10,
        lastPlayedAt: 1700000000000,
      },
    ];
    vi.mocked(historyService.getTopArtists).mockResolvedValueOnce(data);

    const { result } = renderHook(() => useTopArtistsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(historyService.getTopArtists).toHaveBeenCalledWith(10);
    expect(result.current.data).toBe(data);
  });

  it("returns an empty array when there are no top artists", async () => {
    vi.mocked(historyService.getTopArtists).mockResolvedValueOnce([]);

    const { result } = renderHook(() => useTopArtistsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([]);
  });

  it("data shape: each item has artist and playCount", async () => {
    const item = {
      artist: "Artist B",
      playCount: 7,
      lastPlayedAt: 1700000001000,
    };
    vi.mocked(historyService.getTopArtists).mockResolvedValueOnce([item]);

    const { result } = renderHook(() => useTopArtistsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const first = result.current.data![0];
    expect(first.artist).toBe("Artist B");
    expect(first.playCount).toBe(7);
  });
});
