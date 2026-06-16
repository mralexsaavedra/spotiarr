import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLibraryStats } from "@/services/library.service";
import { useLibraryStatsQuery } from "./useLibraryStatsQuery";

vi.mock("@/services/library.service", () => ({
  fetchLibraryArtist: vi.fn(),
  fetchLibraryArtists: vi.fn(),
  fetchLibraryStats: vi.fn(),
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

describe("useLibraryStatsQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = {
      totalArtists: 10,
      totalAlbums: 20,
      totalTracks: 100,
      totalSize: 500000,
      lastScannedAt: "2024-01-01",
    };
    vi.mocked(fetchLibraryStats).mockResolvedValueOnce(data as never);
    const { result } = renderHook(() => useLibraryStatsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });
});
