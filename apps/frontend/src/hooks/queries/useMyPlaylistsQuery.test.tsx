import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { playlistService } from "@/services/playlist.service";
import { useMyPlaylistsQuery } from "./useMyPlaylistsQuery";

vi.mock("@/services/playlist.service", () => ({
  playlistService: { getMyPlaylists: vi.fn() },
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

describe("useMyPlaylistsQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = [
      {
        id: "p1",
        name: "My Playlist",
        image: null,
        owner: "user1",
        tracks: 10,
        spotifyUrl: "https://spotify.com",
      },
    ];
    vi.mocked(playlistService.getMyPlaylists).mockResolvedValueOnce(data as never);
    const { result } = renderHook(() => useMyPlaylistsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });
});
