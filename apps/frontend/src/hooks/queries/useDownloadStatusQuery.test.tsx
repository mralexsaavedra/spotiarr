import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { playlistService } from "@/services/playlist.service";
import { useDownloadStatusQuery } from "./useDownloadStatusQuery";

vi.mock("@/services/playlist.service", () => ({
  playlistService: { getDownloadStatus: vi.fn() },
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

describe("useDownloadStatusQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = { playlistStatusMap: {}, trackStatusMap: {}, albumTrackCountMap: {} };
    vi.mocked(playlistService.getDownloadStatus).mockResolvedValueOnce(data as never);
    const { result } = renderHook(() => useDownloadStatusQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });
});
