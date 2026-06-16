import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSpotifyAuthStatusQuery } from "./useSpotifyAuthStatusQuery";

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

describe("useSpotifyAuthStatusQuery", () => {
  it("success: reaches isSuccess with authenticated data", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ authenticated: true, hasRefreshToken: false }),
    } as Response);
    const { result } = renderHook(() => useSpotifyAuthStatusQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ authenticated: true, hasRefreshToken: false });
  });

  it("error: reaches isError when fetch returns not-ok", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
    } as Response);
    const { result } = renderHook(() => useSpotifyAuthStatusQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
