import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { startArtworkBackfill } from "@/services/artworkBackfill.service";
import { queryKeys } from "../queryKeys";
import { useStartArtworkBackfillMutation } from "./useStartArtworkBackfillMutation";

vi.mock("@/services/artworkBackfill.service", () => ({
  startArtworkBackfill: vi.fn(),
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

describe("useStartArtworkBackfillMutation", () => {
  it("calls startArtworkBackfill and returns the response on success", async () => {
    const response = { runId: "run-123", status: "running" as const };
    vi.mocked(startArtworkBackfill).mockResolvedValueOnce(response);

    const { result } = renderHook(() => useStartArtworkBackfillMutation(), {
      wrapper: createWrapper(),
    });

    let data: unknown;
    await act(async () => {
      data = await result.current.mutateAsync();
    });

    expect(startArtworkBackfill).toHaveBeenCalledTimes(1);
    expect(data).toEqual(response);
  });

  it("invalidates artworkBackfillStatus query on success (via onSettled)", async () => {
    vi.mocked(startArtworkBackfill).mockResolvedValueOnce({ runId: "run-123", status: "running" });

    const { result } = renderHook(() => useStartArtworkBackfillMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync();
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.artworkBackfillStatus });
    });
  });

  it("invalidates artworkBackfillStatus query even on failure (onSettled fires on error too)", async () => {
    vi.mocked(startArtworkBackfill).mockRejectedValueOnce(new Error("Backfill failed"));

    const { result } = renderHook(() => useStartArtworkBackfillMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.artworkBackfillStatus });
  });

  it("sets error state when startArtworkBackfill throws", async () => {
    vi.mocked(startArtworkBackfill).mockRejectedValueOnce(new Error("Service error"));

    const { result } = renderHook(() => useStartArtworkBackfillMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
