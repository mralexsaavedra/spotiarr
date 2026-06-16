import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { playlistService } from "@/services/playlist.service";
import { queryKeys } from "../queryKeys";
import { useRetryFailedTracksMutation } from "./useRetryFailedTracksMutation";

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

describe("useRetryFailedTracksMutation", () => {
  it("calls playlistService.retryFailedTracks with the correct playlistId", async () => {
    vi.mocked(playlistService.retryFailedTracks).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRetryFailedTracksMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("playlist-1");
    });

    expect(playlistService.retryFailedTracks).toHaveBeenCalledWith("playlist-1");
  });

  it("invalidates the correct tracks query key on success", async () => {
    vi.mocked(playlistService.retryFailedTracks).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRetryFailedTracksMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync("playlist-1");
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tracks("playlist-1") });
    });
  });

  it("invalidates tracks for the specific playlist, not a generic key", async () => {
    vi.mocked(playlistService.retryFailedTracks).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRetryFailedTracksMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync("playlist-abc");
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: queryKeys.tracks("playlist-abc"),
      });
    });
  });

  it("sets error state when service throws", async () => {
    vi.mocked(playlistService.retryFailedTracks).mockRejectedValueOnce(new Error("Retry failed"));

    const { result } = renderHook(() => useRetryFailedTracksMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("playlist-1").catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
