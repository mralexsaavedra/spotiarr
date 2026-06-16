import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { playlistService } from "@/services/playlist.service";
import { calculatePlaylistStats } from "@/utils/playlist";
import { usePlaylistsQuery } from "./usePlaylistsQuery";

vi.mock("@/services/playlist.service", () => ({
  playlistService: { getPlaylists: vi.fn() },
}));

vi.mock("@/utils/playlist", () => ({
  calculatePlaylistStats: vi.fn().mockReturnValue({
    completedCount: 1,
    downloadingCount: 0,
    searchingCount: 0,
    queuedCount: 0,
    activeCount: 0,
    errorCount: 0,
    totalCount: 1,
    progress: 100,
    isDownloading: false,
    hasErrors: false,
    isCompleted: true,
  }),
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

describe("usePlaylistsQuery", () => {
  it("success: reaches isSuccess with data defined", async () => {
    const raw = [
      { id: "p1", name: "My Playlist", type: "playlist", spotifyUrl: "https://spotify.com" },
    ];
    vi.mocked(playlistService.getPlaylists).mockResolvedValueOnce(raw as never);
    const { result } = renderHook(() => usePlaylistsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });

  it("select: transform adds stats to each playlist", async () => {
    const raw = [
      { id: "p1", name: "My Playlist", type: "playlist", spotifyUrl: "https://spotify.com" },
    ];
    vi.mocked(playlistService.getPlaylists).mockResolvedValueOnce(raw as never);
    const { result } = renderHook(() => usePlaylistsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(calculatePlaylistStats).toHaveBeenCalledWith(raw[0]);
    expect(result.current.data?.[0]).toHaveProperty("stats");
  });
});
