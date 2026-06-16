import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { artistService } from "@/services/artist.service";
import { useArtistAlbumsQuery } from "./useArtistAlbumsQuery";

vi.mock("@/services/artist.service", () => ({
  artistService: { getArtistAlbums: vi.fn() },
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

describe("useArtistAlbumsQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = [
      {
        artistId: "a1",
        artistName: "Artist",
        artistImageUrl: null,
        albumId: "al1",
        albumName: "Album",
        coverUrl: null,
      },
    ];
    vi.mocked(artistService.getArtistAlbums).mockResolvedValueOnce(data as never);
    const { result } = renderHook(
      () => useArtistAlbumsQuery({ artistId: "a1", limit: 10, offset: 0 }),
      { wrapper: createWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });

  it("disabled: service is NOT called when enabled=false", () => {
    const { result } = renderHook(
      () => useArtistAlbumsQuery({ artistId: "a1", limit: 10, offset: 0, enabled: false }),
      { wrapper: createWrapper() },
    );
    expect(result.current.fetchStatus).toBe("idle");
    expect(artistService.getArtistAlbums).not.toHaveBeenCalled();
  });
});
