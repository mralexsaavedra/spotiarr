import { act, renderHook } from "@testing-library/react";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "./ToastContext";

// ---------------------------------------------------------------------------
// Wrapper helper
// ---------------------------------------------------------------------------

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

// ---------------------------------------------------------------------------
// useToast — outside provider guard
// ---------------------------------------------------------------------------

describe("useToast outside provider", () => {
  it("throws when consumed outside ToastProvider", () => {
    // Suppress the React error boundary noise in test output
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useToast())).toThrow(
      "useToast must be used within a ToastProvider",
    );
    consoleError.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// addToast
// ---------------------------------------------------------------------------

describe("addToast", () => {
  it("appends a toast with the correct message and type", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("Hello world", "success");
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]!.message).toBe("Hello world");
    expect(result.current.toasts[0]!.type).toBe("success");
  });

  it("assigns a non-empty string id to the new toast", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("id check", "info");
    });

    expect(typeof result.current.toasts[0]!.id).toBe("string");
    expect(result.current.toasts[0]!.id.length).toBeGreaterThan(0);
  });

  it("stores the provided duration on the toast", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("with duration", "warning", 5000);
    });

    expect(result.current.toasts[0]!.duration).toBe(5000);
  });

  it("defaults duration to 3000 when not provided", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("default duration", "error");
    });

    expect(result.current.toasts[0]!.duration).toBe(3000);
  });

  it("multiple toasts get distinct ids", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("first", "success");
      result.current.addToast("second", "error");
      result.current.addToast("third", "info");
    });

    const ids = result.current.toasts.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(3);
  });

  it("appends in insertion order", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("first", "success");
      result.current.addToast("second", "error");
    });

    expect(result.current.toasts[0]!.message).toBe("first");
    expect(result.current.toasts[1]!.message).toBe("second");
  });
});

// ---------------------------------------------------------------------------
// removeToast
// ---------------------------------------------------------------------------

describe("removeToast", () => {
  it("removes the toast with the matching id", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("to remove", "info");
    });
    const id = result.current.toasts[0]!.id;

    act(() => {
      result.current.removeToast(id);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("leaves other toasts intact when removing one by id", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("keep me", "success");
      result.current.addToast("remove me", "error");
    });

    const removeId = result.current.toasts[1]!.id;
    act(() => {
      result.current.removeToast(removeId);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]!.message).toBe("keep me");
  });

  it("is a no-op when the id does not exist", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("still here", "info");
    });

    act(() => {
      result.current.removeToast("non-existent-id");
    });

    expect(result.current.toasts).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Auto-dismiss (fake timers)
// ---------------------------------------------------------------------------

describe("auto-dismiss scheduling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("removes the toast after the configured duration", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("will vanish", "success", 2000);
    });

    expect(result.current.toasts).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });

  it("does not remove the toast before the duration elapses", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("still visible", "info", 3000);
    });

    act(() => {
      vi.advanceTimersByTime(2999);
    });

    expect(result.current.toasts).toHaveLength(1);
  });

  it("does NOT schedule auto-removal when duration is 0", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("sticky toast", "warning", 0);
    });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.toasts).toHaveLength(1);
  });

  it("auto-dismisses each toast independently according to its own duration", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.addToast("short", "success", 1000);
      result.current.addToast("long", "error", 5000);
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]!.message).toBe("long");

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(result.current.toasts).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Convenience helpers: success / error / info / warning
// ---------------------------------------------------------------------------

describe("convenience helpers", () => {
  it("success() adds a toast with type 'success'", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.success("Operation done");
    });

    expect(result.current.toasts[0]!.type).toBe("success");
    expect(result.current.toasts[0]!.message).toBe("Operation done");
  });

  it("error() adds a toast with type 'error'", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.error("Something went wrong");
    });

    expect(result.current.toasts[0]!.type).toBe("error");
  });

  it("info() adds a toast with type 'info'", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.info("FYI");
    });

    expect(result.current.toasts[0]!.type).toBe("info");
  });

  it("warning() adds a toast with type 'warning'", () => {
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.warning("Heads up");
    });

    expect(result.current.toasts[0]!.type).toBe("warning");
  });

  it("convenience helpers forward duration to addToast", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast(), { wrapper });

    act(() => {
      result.current.success("custom duration", 1500);
    });

    expect(result.current.toasts[0]!.duration).toBe(1500);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.toasts).toHaveLength(0);
    vi.useRealTimers();
  });
});
