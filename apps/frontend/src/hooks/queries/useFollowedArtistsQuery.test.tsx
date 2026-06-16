import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { artistService } from "@/services/artist.service";
import { settingsService } from "@/services/settings.service";
import { useFollowedArtistsQuery } from "./useFollowedArtistsQuery";

vi.mock("@/services/artist.service", () => ({
  artistService: { getFollowedArtists: vi.fn() },
}));

vi.mock("@/services/settings.service", () => ({
  settingsService: { getSettings: vi.fn() },
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

describe("useFollowedArtistsQuery", () => {
  it("success: returns artists when both services resolve", async () => {
    const artists = [{ id: "a1", name: "Artist", image: null }];
    vi.mocked(settingsService.getSettings).mockResolvedValue([] as never);
    vi.mocked(artistService.getFollowedArtists).mockResolvedValueOnce(artists as never);
    const { result } = renderHook(() => useFollowedArtistsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.artists).toEqual(artists);
    expect(result.current.error).toBeNull();
  });
});
