import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLibraryArtists } from "@/services/library.service";
import { useLibraryArtistsQuery } from "./useLibraryArtistsQuery";

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

describe("useLibraryArtistsQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = [
      { name: "Artist", path: "/music/Artist", albumCount: 1, trackCount: 5, totalSize: 25000 },
    ];
    vi.mocked(fetchLibraryArtists).mockResolvedValueOnce(data as never);
    const { result } = renderHook(() => useLibraryArtistsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });
});
