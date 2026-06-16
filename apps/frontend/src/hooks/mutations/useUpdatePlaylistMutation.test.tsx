import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { playlistService } from "@/services/playlist.service";
import { queryKeys } from "../queryKeys";
import { useUpdatePlaylistMutation } from "./useUpdatePlaylistMutation";

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

describe("useUpdatePlaylistMutation", () => {
  it("calls playlistService.updatePlaylist with correct id and data", async () => {
    vi.mocked(playlistService.updatePlaylist).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUpdatePlaylistMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: "playlist-1", data: { name: "Updated Name" } });
    });

    expect(playlistService.updatePlaylist).toHaveBeenCalledWith("playlist-1", {
      name: "Updated Name",
    });
  });

  it("performs optimistic update — merges data into the matching playlist in cache", async () => {
    vi.mocked(playlistService.updatePlaylist).mockResolvedValueOnce(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdatePlaylistMutation(), { wrapper });

    queryClient.setQueryData(queryKeys.playlists, [
      { id: "playlist-1", name: "Original Name", spotifyUrl: "https://spotify.com/p/1" },
      { id: "playlist-2", name: "Other Playlist" },
    ]);

    // Trigger mutation and check cache synchronously after onMutate
    act(() => {
      result.current.mutate({ id: "playlist-1", data: { name: "Updated Name" } });
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<Array<{ id: string; name: string }>>(
        queryKeys.playlists,
      );
      expect(cached?.find((p) => p.id === "playlist-1")?.name).toBe("Updated Name");
    });
  });

  it("rolls back optimistic update on error", async () => {
    vi.mocked(playlistService.updatePlaylist).mockRejectedValueOnce(new Error("Update failed"));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useUpdatePlaylistMutation(), { wrapper });

    const initialPlaylists = [
      { id: "playlist-1", name: "Original Name" },
      { id: "playlist-2", name: "Other Playlist" },
    ];
    queryClient.setQueryData(queryKeys.playlists, initialPlaylists);

    await act(async () => {
      await result.current
        .mutateAsync({ id: "playlist-1", data: { name: "Updated Name" } })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData(queryKeys.playlists);
    expect(cached).toEqual(initialPlaylists);
  });

  it("does NOT invalidate any query on success (no onSuccess handler)", async () => {
    vi.mocked(playlistService.updatePlaylist).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUpdatePlaylistMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync({ id: "playlist-1", data: { name: "Updated Name" } });
    });

    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("sets error state when service throws", async () => {
    vi.mocked(playlistService.updatePlaylist).mockRejectedValueOnce(new Error("Server error"));

    const { result } = renderHook(() => useUpdatePlaylistMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current
        .mutateAsync({ id: "playlist-1", data: { name: "X" } })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
