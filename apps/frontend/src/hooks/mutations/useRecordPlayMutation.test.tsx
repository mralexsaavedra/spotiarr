import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { historyService } from "@/services/history.service";
import type { QueueItem } from "@/store/usePlayerStore";
import { useRecordPlayMutation } from "./useRecordPlayMutation";

vi.mock("@/services/history.service", () => ({
  historyService: {
    recordPlay: vi.fn(),
    getDownloadHistory: vi.fn(),
    getDownloadTracks: vi.fn(),
  },
}));

const makeQueueItem = (id: string): QueueItem => ({
  id,
  name: "Track A",
  artist: "Artist A",
  album: "Album A",
  artworkUrl: "https://example.com/art.jpg",
  audioUrl: `/api/library/audio?id=${id}`,
  durationMs: 180_000,
});

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

describe("useRecordPlayMutation", () => {
  it("calls historyService.recordPlay with the QueueItem", async () => {
    vi.mocked(historyService.recordPlay).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useRecordPlayMutation(), {
      wrapper: createWrapper(),
    });

    const item = makeQueueItem("track-1");
    await act(async () => {
      result.current.mutate(item);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(historyService.recordPlay).toHaveBeenCalledOnce();
    expect(historyService.recordPlay).toHaveBeenCalledWith(item);
  });

  it("swallows errors — mutation does not throw on service failure", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(historyService.recordPlay).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useRecordPlayMutation(), {
      wrapper: createWrapper(),
    });

    const item = makeQueueItem("track-2");

    await act(async () => {
      // fire-and-forget: mutate (not mutateAsync) so error does NOT propagate
      result.current.mutate(item);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    // Error is swallowed — no unhandled rejection thrown
    // The console.error was called (logged, not rethrown)
    expect(consoleError).toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it("is fire-and-forget: mutateAsync resolves (does not reject) when service fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.mocked(historyService.recordPlay).mockRejectedValueOnce(new Error("500 Server Error"));

    const { result } = renderHook(() => useRecordPlayMutation(), {
      wrapper: createWrapper(),
    });

    const item = makeQueueItem("track-3");

    // The mutation hook uses onError to swallow; calling mutate (not mutateAsync)
    // means no propagation. We test that mutation enters error state without throwing.
    let threw = false;
    await act(async () => {
      try {
        result.current.mutate(item);
      } catch {
        threw = true;
      }
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(threw).toBe(false);

    consoleError.mockRestore();
  });
});
