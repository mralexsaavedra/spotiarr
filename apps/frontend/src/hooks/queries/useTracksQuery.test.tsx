import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { trackService } from "@/services/track.service";
import { useTracksQuery } from "./useTracksQuery";

vi.mock("@/services/track.service", () => ({
  trackService: { getTracksByPlaylist: vi.fn() },
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

describe("useTracksQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = [
      { id: "t1", name: "Track", artist: "Artist", status: "completed", playlistId: "p1" },
    ];
    vi.mocked(trackService.getTracksByPlaylist).mockResolvedValueOnce(data as never);
    const { result } = renderHook(() => useTracksQuery("p1"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });

  it("disabled: service is NOT called when playlistId is undefined", () => {
    const { result } = renderHook(() => useTracksQuery(undefined), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(trackService.getTracksByPlaylist).not.toHaveBeenCalled();
  });
});
