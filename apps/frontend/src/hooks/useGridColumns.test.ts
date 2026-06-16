import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { APP_CONFIG } from "@/config/app";
import { useGridColumns } from "./useGridColumns";

const { BREAKPOINTS, COLUMNS } = APP_CONFIG.GRID;

// Helper: set window.innerWidth and fire a resize event.
function setWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  act(() => {
    window.dispatchEvent(new Event("resize"));
  });
}

describe("useGridColumns", () => {
  const originalWidth = window.innerWidth;

  afterEach(() => {
    // Restore original innerWidth
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: originalWidth,
    });
  });

  it("returns MOBILE columns when width is below SM breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: BREAKPOINTS.SM - 1,
    });
    const { result } = renderHook(() => useGridColumns());
    expect(result.current).toBe(COLUMNS.MOBILE);
  });

  it("returns SM columns at the SM breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: BREAKPOINTS.SM,
    });
    const { result } = renderHook(() => useGridColumns());
    expect(result.current).toBe(COLUMNS.SM);
  });

  it("returns MD columns at the MD breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: BREAKPOINTS.MD,
    });
    const { result } = renderHook(() => useGridColumns());
    expect(result.current).toBe(COLUMNS.MD);
  });

  it("returns LG columns at the LG breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: BREAKPOINTS.LG,
    });
    const { result } = renderHook(() => useGridColumns());
    expect(result.current).toBe(COLUMNS.LG);
  });

  it("returns XL columns at the XL breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: BREAKPOINTS.XL,
    });
    const { result } = renderHook(() => useGridColumns());
    expect(result.current).toBe(COLUMNS.XL);
  });

  it("returns LARGE columns at the LARGE breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: BREAKPOINTS.LARGE,
    });
    const { result } = renderHook(() => useGridColumns());
    expect(result.current).toBe(COLUMNS.LARGE);
  });

  it("returns ULTRAWIDE columns at the ULTRAWIDE breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: BREAKPOINTS.ULTRAWIDE,
    });
    const { result } = renderHook(() => useGridColumns());
    expect(result.current).toBe(COLUMNS.ULTRAWIDE);
  });

  it("updates columns when the window is resized to a larger breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: BREAKPOINTS.SM - 1,
    });
    const { result } = renderHook(() => useGridColumns());
    expect(result.current).toBe(COLUMNS.MOBILE);

    setWidth(BREAKPOINTS.LG);
    expect(result.current).toBe(COLUMNS.LG);
  });

  it("updates columns when the window is resized to a smaller breakpoint", () => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: BREAKPOINTS.XL,
    });
    const { result } = renderHook(() => useGridColumns());
    expect(result.current).toBe(COLUMNS.XL);

    setWidth(BREAKPOINTS.SM - 1);
    expect(result.current).toBe(COLUMNS.MOBILE);
  });

  it("removes the resize listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useGridColumns());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});
