import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { settingsService } from "@/services/settings.service";
import { useSupportedFormatsQuery } from "./useSupportedFormatsQuery";

vi.mock("@/services/settings.service", () => ({
  settingsService: { getSupportedFormats: vi.fn() },
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

describe("useSupportedFormatsQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = ["mp3", "flac"];
    vi.mocked(settingsService.getSupportedFormats).mockResolvedValueOnce(data as never);
    const { result } = renderHook(() => useSupportedFormatsQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });
});
