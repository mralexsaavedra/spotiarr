import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { artistService } from "@/services/artist.service";
import { useAlbumTracksQuery } from "./useAlbumTracksQuery";

vi.mock("@/services/artist.service", () => ({
  artistService: { getAlbumTracks: vi.fn() },
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

describe("useAlbumTracksQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = [
      { name: "Track 1", artist: "Artist 1", artists: [{ name: "Artist 1", url: undefined }] },
    ];
    vi.mocked(artistService.getAlbumTracks).mockResolvedValueOnce(data as never);
    const { result } = renderHook(
      () => useAlbumTracksQuery({ artistId: "a1", albumId: "al1", enabled: true }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });

  it("disabled: service is NOT called when enabled=false", () => {
    const { result } = renderHook(
      () => useAlbumTracksQuery({ artistId: "a1", albumId: "al1", enabled: false }),
      { wrapper: createWrapper() },
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(artistService.getAlbumTracks).not.toHaveBeenCalled();
  });
});
