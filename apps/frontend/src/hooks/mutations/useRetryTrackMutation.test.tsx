import { TrackStatusEnum } from "@spotiarr/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { trackService } from "@/services/track.service";
import { queryKeys } from "../queryKeys";
import { useRetryTrackMutation } from "./useRetryTrackMutation";

vi.mock("@/services/track.service", () => ({
  trackService: {
    retryTrack: vi.fn(),
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

describe("useRetryTrackMutation", () => {
  it("calls trackService.retryTrack with the correct trackId", async () => {
    vi.mocked(trackService.retryTrack).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRetryTrackMutation("playlist-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("track-1");
    });

    expect(trackService.retryTrack).toHaveBeenCalledWith("track-1");
  });

  it("optimistically sets track status to Searching on mutate", async () => {
    vi.mocked(trackService.retryTrack).mockResolvedValueOnce(undefined);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRetryTrackMutation("playlist-1"), { wrapper });

    queryClient.setQueryData(queryKeys.tracks("playlist-1"), [
      { id: "track-1", status: TrackStatusEnum.Error, playlistId: "playlist-1" },
      { id: "track-2", status: TrackStatusEnum.Completed, playlistId: "playlist-1" },
    ]);

    // Use mutate (not mutateAsync) and check cache after onMutate fires
    act(() => {
      result.current.mutate("track-1");
    });

    // onMutate is synchronous after cancellation — check optimistic state
    await waitFor(() => {
      const cached = queryClient.getQueryData<Array<{ id: string; status: TrackStatusEnum }>>(
        queryKeys.tracks("playlist-1"),
      );
      expect(cached?.find((t) => t.id === "track-1")?.status).toBe(TrackStatusEnum.Searching);
    });
  });

  it("rolls back optimistic update on error", async () => {
    vi.mocked(trackService.retryTrack).mockRejectedValueOnce(new Error("Retry failed"));

    const wrapper = createWrapper();
    const { result } = renderHook(() => useRetryTrackMutation("playlist-1"), { wrapper });

    const initialTracks = [
      { id: "track-1", status: TrackStatusEnum.Error, playlistId: "playlist-1" },
    ];
    queryClient.setQueryData(queryKeys.tracks("playlist-1"), initialTracks);

    await act(async () => {
      await result.current.mutateAsync("track-1").catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = queryClient.getQueryData(queryKeys.tracks("playlist-1"));
    expect(cached).toEqual(initialTracks);
  });

  it("invalidates tracks query on success", async () => {
    vi.mocked(trackService.retryTrack).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRetryTrackMutation("playlist-1"), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync("track-1");
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.tracks("playlist-1") });
    });
  });

  it("sets error state when service throws", async () => {
    vi.mocked(trackService.retryTrack).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useRetryTrackMutation("playlist-1"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("track-1").catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
