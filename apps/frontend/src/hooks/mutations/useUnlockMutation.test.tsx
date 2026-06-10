import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/services/auth.service";
import { queryKeys } from "../queryKeys";
import { useUnlockMutation } from "./useUnlockMutation";

vi.mock("@/services/auth.service", () => ({
  authService: {
    unlock: vi.fn(),
  },
}));

let queryClient: QueryClient;

const createWrapper = () => {
  queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useUnlockMutation", () => {
  it("mutateAsync calls authService.unlock with the provided token", async () => {
    vi.mocked(authService.unlock).mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useUnlockMutation(), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      await result.current.mutateAsync("my-token");
    });

    expect(authService.unlock).toHaveBeenCalledWith("my-token");
  });

  it("on success, invalidates the authSession query", async () => {
    vi.mocked(authService.unlock).mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useUnlockMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync("my-token");
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.authSession });
  });

  it("on failure, mutation is in error state and does not invalidate queries", async () => {
    const error = { status: 401, message: "Bad token" };
    vi.mocked(authService.unlock).mockRejectedValueOnce(error);

    const { result } = renderHook(() => useUnlockMutation(), {
      wrapper: createWrapper(),
    });

    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    await act(async () => {
      await result.current.mutateAsync("wrong-token").catch(() => undefined);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
