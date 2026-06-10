import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTokenGate } from "./useTokenGate";

const mockMutateAsync = vi.fn();
let mockSessionState: {
  isPending: boolean;
  isFetching: boolean;
  isSuccess: boolean;
  error: unknown;
} = {
  isPending: true,
  isFetching: false,
  isSuccess: false,
  error: null,
};

vi.mock("../queries/useAuthSessionQuery", () => ({
  useAuthSessionQuery: () => mockSessionState,
}));

vi.mock("../mutations/useUnlockMutation", () => ({
  useUnlockMutation: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

const mockSetUnauthorizedHandler = vi.fn();
const mockClearUnauthorizedHandler = vi.fn();

vi.mock("@/services/httpClient", () => ({
  setUnauthorizedHandler: (fn: () => void) => mockSetUnauthorizedHandler(fn),
  clearUnauthorizedHandler: () => mockClearUnauthorizedHandler(),
}));

describe("useTokenGate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionState = { isPending: true, isFetching: false, isSuccess: false, error: null };
  });

  it("TG-1: phase is 'checking' when session is pending", () => {
    mockSessionState = { isPending: true, isFetching: false, isSuccess: false, error: null };
    const { result } = renderHook(() => useTokenGate());
    expect(result.current.phase).toBe("checking");
  });

  it("TG-2: phase is 'checking' when session is fetching (not pending)", () => {
    mockSessionState = { isPending: false, isFetching: true, isSuccess: false, error: null };
    const { result } = renderHook(() => useTokenGate());
    expect(result.current.phase).toBe("checking");
  });

  it("TG-3: phase is 'unlocked' when session succeeds", () => {
    mockSessionState = { isPending: false, isFetching: false, isSuccess: true, error: null };
    const { result } = renderHook(() => useTokenGate());
    expect(result.current.phase).toBe("unlocked");
    expect(result.current.sessionExpired).toBe(false);
  });

  it("TG-4: phase is 'locked' when session errors with 401", () => {
    mockSessionState = {
      isPending: false,
      isFetching: false,
      isSuccess: false,
      error: { status: 401 },
    };
    const { result } = renderHook(() => useTokenGate());
    expect(result.current.phase).toBe("locked");
  });

  it("TG-5: phase is 'error' when session errors with non-401 (retries exhausted)", () => {
    mockSessionState = {
      isPending: false,
      isFetching: false,
      isSuccess: false,
      error: { status: 503 },
    };
    const { result } = renderHook(() => useTokenGate());
    expect(result.current.phase).toBe("error");
  });

  it("TG-6: registers setUnauthorizedHandler on mount and clears on unmount", () => {
    const { unmount } = renderHook(() => useTokenGate());
    expect(mockSetUnauthorizedHandler).toHaveBeenCalledTimes(1);
    unmount();
    expect(mockClearUnauthorizedHandler).toHaveBeenCalledTimes(1);
  });

  it("TG-7: sessionExpired re-lock — unauthorized handler sets phase to locked and sessionExpired when previously unlocked", () => {
    mockSessionState = { isPending: false, isFetching: false, isSuccess: true, error: null };

    const { result } = renderHook(() => useTokenGate());
    expect(result.current.phase).toBe("unlocked");

    const handler = mockSetUnauthorizedHandler.mock.calls[0][0] as () => void;
    act(() => {
      handler();
    });

    expect(result.current.phase).toBe("locked");
    expect(result.current.sessionExpired).toBe(true);
  });

  it("TG-8: unauthorized handler sets phase locked but NOT sessionExpired when never unlocked", () => {
    mockSessionState = { isPending: true, isFetching: false, isSuccess: false, error: null };

    const { result } = renderHook(() => useTokenGate());

    const handler = mockSetUnauthorizedHandler.mock.calls[0][0] as () => void;
    act(() => {
      handler();
    });

    expect(result.current.phase).toBe("locked");
    expect(result.current.sessionExpired).toBe(false);
  });

  it("TG-9: unlock() calls mutateAsync with the token and clears sessionExpired", async () => {
    mockSessionState = { isPending: false, isFetching: false, isSuccess: true, error: null };
    mockMutateAsync.mockResolvedValueOnce({ ok: true });

    const { result } = renderHook(() => useTokenGate());

    const handler = mockSetUnauthorizedHandler.mock.calls[0][0] as () => void;
    act(() => {
      handler();
    });
    expect(result.current.sessionExpired).toBe(true);

    await act(async () => {
      await result.current.unlock("secret-token");
    });

    expect(mockMutateAsync).toHaveBeenCalledWith("secret-token");
    expect(result.current.sessionExpired).toBe(false);
  });

  it("TG-10: unlock() propagates mutateAsync rejection", async () => {
    mockSessionState = { isPending: false, isFetching: false, isSuccess: false, error: null };
    mockMutateAsync.mockRejectedValueOnce({ status: 401, message: "Bad token" });

    const { result } = renderHook(() => useTokenGate());

    await expect(
      act(async () => {
        await result.current.unlock("wrong-token");
      }),
    ).rejects.toBeDefined();
  });
});
