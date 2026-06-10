import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "@/services/auth.service";
import { useAuthSessionQuery } from "./useAuthSessionQuery";

vi.mock("@/services/auth.service", () => ({
  authService: {
    getSession: vi.fn(),
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("useAuthSessionQuery", () => {
  it("success: reaches isSuccess with the resolved data", async () => {
    const data = { authenticated: true };
    vi.mocked(authService.getSession).mockResolvedValueOnce(data as never);

    const { result } = renderHook(() => useAuthSessionQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBe(data);
  });

  it("401: does not retry — getSession called exactly once and hook is in error state", async () => {
    vi.mocked(authService.getSession).mockRejectedValue({ status: 401 });

    const { result } = renderHook(() => useAuthSessionQuery(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(authService.getSession).toHaveBeenCalledTimes(1);
  });

  it("non-401: exhausts retries — called 6 times total and ends in error state with no data", async () => {
    vi.useFakeTimers();
    vi.mocked(authService.getSession).mockRejectedValue({ status: 500 });

    const { result } = renderHook(() => useAuthSessionQuery(), {
      wrapper: createWrapper(),
    });

    for (let i = 0; i < 5; i++) {
      await vi.advanceTimersByTimeAsync(1_100);
    }
    await vi.runAllTimersAsync();

    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(authService.getSession).toHaveBeenCalledTimes(6);
  }, 20_000);
});
