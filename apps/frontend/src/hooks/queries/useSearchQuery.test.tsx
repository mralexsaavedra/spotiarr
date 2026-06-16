import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SearchService } from "../../services/search.service";
import { useSearchQuery } from "./useSearchQuery";

vi.mock("../../services/search.service", () => ({
  SearchService: { searchCatalog: vi.fn() },
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

describe("useSearchQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = { tracks: [], albums: [], artists: [] };
    vi.mocked(SearchService.searchCatalog).mockResolvedValueOnce(data as never);
    const { result } = renderHook(() => useSearchQuery("radiohead"), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });

  it("disabled: service is NOT called when query is empty string", () => {
    const { result } = renderHook(() => useSearchQuery(""), { wrapper: createWrapper() });
    expect(result.current.fetchStatus).toBe("idle");
    expect(SearchService.searchCatalog).not.toHaveBeenCalled();
  });
});
