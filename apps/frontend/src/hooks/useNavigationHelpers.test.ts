import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";
import { useNavigationHelpers } from "./useNavigationHelpers";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("useNavigationHelpers", () => {
  it("handleGoBack calls navigate(-1)", () => {
    const { result } = renderHook(() => useNavigationHelpers());
    act(() => result.current.handleGoBack());
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("handleGoHome calls navigate with Path.HOME", () => {
    const { result } = renderHook(() => useNavigationHelpers());
    act(() => result.current.handleGoHome());
    expect(mockNavigate).toHaveBeenCalledWith(Path.HOME);
  });

  it("Path.HOME resolves to '/'", () => {
    expect(Path.HOME).toBe("/");
  });

  it("handleGoBack and handleGoHome are stable references across re-renders", () => {
    const { result, rerender } = renderHook(() => useNavigationHelpers());
    const { handleGoBack: back1, handleGoHome: home1 } = result.current;

    rerender();

    expect(result.current.handleGoBack).toBe(back1);
    expect(result.current.handleGoHome).toBe(home1);
  });

  it("returns an object with exactly handleGoBack and handleGoHome", () => {
    const { result } = renderHook(() => useNavigationHelpers());
    expect(typeof result.current.handleGoBack).toBe("function");
    expect(typeof result.current.handleGoHome).toBe("function");
  });
});
