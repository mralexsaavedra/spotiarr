import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { historyService } from "@/services/history.service";
import { useDownloadHistoryQuery } from "./useDownloadHistoryQuery";

vi.mock("@/services/history.service", () => ({
  historyService: { getDownloadHistory: vi.fn() },
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

describe("useDownloadHistoryQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = [
      {
        playlistId: "p1",
        playlistName: "My Playlist",
        playlistSpotifyUrl: null,
        trackCount: 5,
        lastCompletedAt: 1234567890,
      },
    ];
    vi.mocked(historyService.getDownloadHistory).mockResolvedValueOnce(data as never);
    const { result } = renderHook(() => useDownloadHistoryQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });
});
