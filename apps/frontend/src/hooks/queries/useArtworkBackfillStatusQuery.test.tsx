import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchArtworkBackfillStatus } from "@/services/artworkBackfill.service";
import { useArtworkBackfillStatusQuery } from "./useArtworkBackfillStatusQuery";

vi.mock("@/services/artworkBackfill.service", () => ({
  fetchArtworkBackfillStatus: vi.fn(),
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

describe("useArtworkBackfillStatusQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = { status: "idle", processed: 0, total: 0, errors: 0 };
    vi.mocked(fetchArtworkBackfillStatus).mockResolvedValueOnce(data as never);
    const { result } = renderHook(() => useArtworkBackfillStatusQuery(), {
      wrapper: createWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });
});
