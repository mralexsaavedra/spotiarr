import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { externalUrlService } from "@/services/external-url.service";
import { useResolveExternalUrl } from "./useResolveExternalUrl";

vi.mock("@/services/external-url.service", () => ({
  externalUrlService: {
    resolve: vi.fn(),
  },
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

describe("useResolveExternalUrl", () => {
  it("calls externalUrlService.resolve with correct params and returns url on success", async () => {
    const resolved = { url: "https://open.spotify.com/artist/123" };
    vi.mocked(externalUrlService.resolve).mockResolvedValueOnce(resolved);

    const { result } = renderHook(() => useResolveExternalUrl(), {
      wrapper: createWrapper(),
    });

    let data: unknown;
    await act(async () => {
      data = await result.current.mutateAsync({
        provider: "spotify",
        type: "artist",
        id: "123",
        name: "Test Artist",
      });
    });

    expect(externalUrlService.resolve).toHaveBeenCalledWith({
      provider: "spotify",
      type: "artist",
      id: "123",
      name: "Test Artist",
    });
    expect(data).toEqual(resolved);
  });

  it("calls externalUrlService.resolve without optional fields", async () => {
    vi.mocked(externalUrlService.resolve).mockResolvedValueOnce({
      url: "https://deezer.com/album/456",
    });

    const { result } = renderHook(() => useResolveExternalUrl(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync({ provider: "deezer", type: "album", id: "456" });
    });

    expect(externalUrlService.resolve).toHaveBeenCalledWith({
      provider: "deezer",
      type: "album",
      id: "456",
    });
  });

  it("sets error state on service failure", async () => {
    vi.mocked(externalUrlService.resolve).mockRejectedValueOnce(new Error("Resolve failed"));

    const { result } = renderHook(() => useResolveExternalUrl(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current
        .mutateAsync({ provider: "spotify", type: "track", id: "999" })
        .catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
