import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { playlistService } from "@/services/playlist.service";
import { queryKeys } from "../queryKeys";
import { useRecreatePlaylistMutation } from "./useRecreatePlaylistMutation";

vi.mock("@/services/playlist.service", () => ({
  playlistService: {
    createPlaylist: vi.fn(),
    deletePlaylist: vi.fn(),
    updatePlaylist: vi.fn(),
    retryFailedTracks: vi.fn(),
  },
}));

let queryClient: QueryClient;

const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useRecreatePlaylistMutation", () => {
  it("calls playlistService.createPlaylist with kind=spotifyUrl and the given url", async () => {
    const playlist = { id: "pl-1", name: "Recreated" };
    vi.mocked(playlistService.createPlaylist).mockResolvedValueOnce(playlist as never);

    const { result } = renderHook(() => useRecreatePlaylistMutation(), {
      wrapper: createWrapper(),
    });

    let data: unknown;
    await act(async () => {
      data = await result.current.mutateAsync("https://open.spotify.com/playlist/xyz");
    });

    expect(playlistService.createPlaylist).toHaveBeenCalledWith({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/playlist/xyz",
    });
    expect(data).toEqual(playlist);
  });

  it("invalidates playlists query on success", async () => {
    vi.mocked(playlistService.createPlaylist).mockResolvedValueOnce({ id: "pl-1" } as never);

    const { result } = renderHook(() => useRecreatePlaylistMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync("https://open.spotify.com/playlist/xyz");
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.playlists });
    });
  });

  it("sets error state on service failure", async () => {
    vi.mocked(playlistService.createPlaylist).mockRejectedValueOnce(new Error("Service error"));

    const { result } = renderHook(() => useRecreatePlaylistMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current
        .mutateAsync("https://open.spotify.com/playlist/xyz")
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
