import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { artistService } from "@/services/artist.service";
import { settingsService } from "@/services/settings.service";
import { useReleasesQuery } from "./useReleasesQuery";

vi.mock("@/services/artist.service", () => ({
  artistService: { getReleases: vi.fn() },
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

describe("useReleasesQuery", () => {
  it("success: returns releases when both services resolve", async () => {
    const releases = [
      {
        artistId: "a1",
        artistName: "Artist",
        artistImageUrl: null,
        albumId: "al1",
        albumName: "Album",
        coverUrl: null,
      },
    ];
    vi.mocked(settingsService.getSettings).mockResolvedValue([] as never);
    vi.mocked(artistService.getReleases).mockResolvedValueOnce(releases as never);
    const { result } = renderHook(() => useReleasesQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.releases).toEqual(releases);
    expect(result.current.error).toBeNull();
  });
});
