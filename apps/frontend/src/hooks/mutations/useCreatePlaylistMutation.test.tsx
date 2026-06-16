import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { playlistService } from "@/services/playlist.service";
import { queryKeys } from "../queryKeys";
import { useCreatePlaylistMutation } from "./useCreatePlaylistMutation";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));
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

describe("useCreatePlaylistMutation", () => {
  it("calls playlistService.createPlaylist with correct args and returns data on success", async () => {
    const playlist = { id: "pl-1", name: "My Playlist" };
    vi.mocked(playlistService.createPlaylist).mockResolvedValueOnce(playlist as never);

    const { result } = renderHook(() => useCreatePlaylistMutation(), {
      wrapper: createWrapper(),
    });

    let data: unknown;
    await act(async () => {
      data = await result.current.mutateAsync({
        kind: "spotifyUrl",
        spotifyUrl: "https://open.spotify.com/playlist/abc",
      });
    });

    expect(playlistService.createPlaylist).toHaveBeenCalledWith({
      kind: "spotifyUrl",
      spotifyUrl: "https://open.spotify.com/playlist/abc",
    });
    expect(data).toEqual(playlist);
  });

  it("invalidates playlists query on success", async () => {
    vi.mocked(playlistService.createPlaylist).mockResolvedValueOnce({ id: "pl-1" } as never);

    const { result } = renderHook(() => useCreatePlaylistMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync({
        kind: "spotifyUrl",
        spotifyUrl: "https://open.spotify.com/playlist/abc",
      });
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.playlists });
    });
  });

  it("sets error state on service failure", async () => {
    vi.mocked(playlistService.createPlaylist).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useCreatePlaylistMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current
        .mutateAsync({ kind: "spotifyUrl", spotifyUrl: "https://open.spotify.com/playlist/abc" })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
