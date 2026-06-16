import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { scanLibrary } from "@/services/library.service";
import { queryKeys } from "../queryKeys";
import { useScanLibraryMutation } from "./useScanLibraryMutation";

vi.mock("@/services/library.service", () => ({
  scanLibrary: vi.fn(),
}));

let queryClient: QueryClient;

const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

afterEach(() => {
  vi.clearAllMocks();
});

const mockScanResult = {
  artists: [],
  totalArtists: 0,
  totalAlbums: 0,
  totalTracks: 0,
  totalSize: 0,
  lastScannedAt: 0,
  scanDuration: 0,
};

describe("useScanLibraryMutation", () => {
  it("calls scanLibrary and returns the scan result on success", async () => {
    vi.mocked(scanLibrary).mockResolvedValueOnce(mockScanResult);

    const { result } = renderHook(() => useScanLibraryMutation(), {
      wrapper: createWrapper(),
    });

    let data: unknown;
    await act(async () => {
      data = await result.current.mutateAsync();
    });

    expect(scanLibrary).toHaveBeenCalledTimes(1);
    expect(data).toEqual(mockScanResult);
  });

  it("invalidates library query on success", async () => {
    vi.mocked(scanLibrary).mockResolvedValueOnce(mockScanResult);

    const { result } = renderHook(() => useScanLibraryMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.library });
    });
  });

  it("sets error state when scanLibrary throws", async () => {
    vi.mocked(scanLibrary).mockRejectedValueOnce(new Error("Scan failed"));

    const { result } = renderHook(() => useScanLibraryMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
