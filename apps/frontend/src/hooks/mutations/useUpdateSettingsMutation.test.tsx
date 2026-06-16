import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { settingsService } from "@/services/settings.service";
import { queryKeys } from "../queryKeys";
import { useUpdateSettingsMutation } from "./useUpdateSettingsMutation";

vi.mock("@/services/settings.service", () => ({
  settingsService: {
    updateSettings: vi.fn(),
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

describe("useUpdateSettingsMutation", () => {
  it("calls settingsService.updateSettings with correct settings array", async () => {
    vi.mocked(settingsService.updateSettings).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUpdateSettingsMutation(), {
      wrapper: createWrapper(),
    });

    const settings = [
      { key: "theme", value: "dark" },
      { key: "language", value: "en" },
    ];

    await act(async () => {
      await result.current.mutateAsync(settings);
    });

    expect(settingsService.updateSettings).toHaveBeenCalledWith(settings);
  });

  it("invalidates settings query on success", async () => {
    vi.mocked(settingsService.updateSettings).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUpdateSettingsMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync([{ key: "foo", value: "bar" }]);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.settings });
    });
  });

  it("invalidates releases query on success", async () => {
    vi.mocked(settingsService.updateSettings).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUpdateSettingsMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync([{ key: "foo", value: "bar" }]);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.releases });
    });
  });

  it("invalidates followedArtists query on success", async () => {
    vi.mocked(settingsService.updateSettings).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUpdateSettingsMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync([{ key: "foo", value: "bar" }]);
    });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.followedArtists });
    });
  });

  it("invalidates artist-detail and artist-albums via predicate on success", async () => {
    vi.mocked(settingsService.updateSettings).mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useUpdateSettingsMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync([{ key: "foo", value: "bar" }]);
    });

    await waitFor(() => {
      // The predicate-based invalidation call — verify it was called with a predicate function
      const predicateCalls = invalidateSpy.mock.calls.filter(
        (call) => typeof call[0] === "object" && call[0] !== null && "predicate" in call[0],
      );
      expect(predicateCalls.length).toBeGreaterThan(0);

      // Verify the predicate matches artist-detail and artist-albums query keys
      const rawArg = predicateCalls[0][0] as unknown as {
        predicate: (query: { queryKey: unknown[] }) => boolean;
      };
      expect(rawArg.predicate({ queryKey: ["artist-detail", "artist-123"] })).toBe(true);
      expect(rawArg.predicate({ queryKey: ["artist-albums", "artist-123", 10, 0] })).toBe(true);
      expect(rawArg.predicate({ queryKey: ["settings"] })).toBe(false);
    });
  });

  it("sets error state when service throws", async () => {
    vi.mocked(settingsService.updateSettings).mockRejectedValueOnce(new Error("Save failed"));

    const { result } = renderHook(() => useUpdateSettingsMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync([{ key: "foo", value: "bar" }]).catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
