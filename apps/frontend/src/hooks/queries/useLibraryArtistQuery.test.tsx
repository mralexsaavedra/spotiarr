import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLibraryArtist } from "@/services/library.service";
import { useLibraryArtistQuery } from "./useLibraryArtistQuery";

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

describe("useLibraryArtistQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = {
      name: "Artist",
      path: "/music/Artist",
      albumCount: 2,
      trackCount: 10,
      totalSize: 50000,
      albums: [],
    };
    vi.mocked(fetchLibraryArtist).mockResolvedValueOnce(data as never);
    const { result } = renderHook(() => useLibraryArtistQuery("Artist"), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });

  it("disabled: service is NOT called when name is empty string", () => {
    const { result } = renderHook(() => useLibraryArtistQuery(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(fetchLibraryArtist).not.toHaveBeenCalled();
  });
});
