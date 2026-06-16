import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { playlistService } from "@/services/playlist.service";
import { usePlaylistPreviewQuery } from "./usePlaylistPreviewQuery";

vi.mock("@/services/playlist.service", () => ({
  playlistService: { getPlaylistPreview: vi.fn() },
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

describe("usePlaylistPreviewQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = {
      name: "Playlist",
      type: "playlist",
      description: "",
      coverUrl: null,
      totalTracks: 5,
      tracks: [],
    };
    vi.mocked(playlistService.getPlaylistPreview).mockResolvedValueOnce(data as never);
    const { result } = renderHook(
      () => usePlaylistPreviewQuery("https://open.spotify.com/playlist/abc"),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });

  it("disabled: service is NOT called when spotifyUrl is null", () => {
    const { result } = renderHook(() => usePlaylistPreviewQuery(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.fetchStatus).toBe("idle");
    expect(playlistService.getPlaylistPreview).not.toHaveBeenCalled();
  });
});
