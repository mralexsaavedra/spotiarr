import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { settingsService } from "@/services/settings.service";
import { useSettingsMetadataQuery } from "./useSettingsMetadataQuery";

vi.mock("@/services/settings.service", () => ({
  settingsService: { getSettingsMetadata: vi.fn() },
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

describe("useSettingsMetadataQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = {
      key1: {
        key: "key1",
        defaultValue: "val",
        type: "string",
        component: "input",
        section: "general",
        label: "Key 1",
        description: "",
      },
    };
    vi.mocked(settingsService.getSettingsMetadata).mockResolvedValueOnce(data as never);
    const { result } = renderHook(() => useSettingsMetadataQuery(), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });
});
