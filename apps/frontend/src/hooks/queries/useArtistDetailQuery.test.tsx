import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { artistService } from "@/services/artist.service";
import { useArtistDetailQuery } from "./useArtistDetailQuery";

vi.mock("@/services/artist.service", () => ({
  artistService: { getArtistDetail: vi.fn() },
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

describe("useArtistDetailQuery", () => {
  it("success: returns artist when artistId is provided", async () => {
    const artist = {
      id: "a1",
      name: "Artist",
      imageUrl: null,
      albums: [],
      catalogRefreshPending: false,
    };
    vi.mocked(artistService.getArtistDetail).mockResolvedValueOnce(artist as never);
    const { result } = renderHook(() => useArtistDetailQuery("a1"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.artist).toBe(artist);
    expect(result.current.error).toBeNull();
  });

  it("disabled: service is NOT called when artistId is null", () => {
    vi.mocked(artistService.getArtistDetail).mockResolvedValueOnce(undefined as never);
    const { result } = renderHook(() => useArtistDetailQuery(null), { wrapper: createWrapper() });
    expect(result.current.artist).toBeNull();
    expect(artistService.getArtistDetail).not.toHaveBeenCalled();
  });
});
