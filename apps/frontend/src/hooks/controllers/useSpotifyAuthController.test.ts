import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseSpotifyAuthStatusQuery = vi.fn();
const mockMutate = vi.fn();
const mockUseSpotifyLogoutMutation = vi.fn();

vi.mock("@/hooks/queries/useSpotifyAuthStatusQuery", () => ({
  useSpotifyAuthStatusQuery: () => mockUseSpotifyAuthStatusQuery(),
}));

vi.mock("@/hooks/mutations/useSpotifyLogoutMutation", () => ({
  useSpotifyLogoutMutation: () => mockUseSpotifyLogoutMutation(),
}));

const { useSpotifyAuthController } = await import("./useSpotifyAuthController");

describe("useSpotifyAuthController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSpotifyAuthStatusQuery.mockReturnValue({
      data: { authenticated: false, hasRefreshToken: false },
      isLoading: false,
    });
    mockUseSpotifyLogoutMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    });
    Object.defineProperty(window, "location", {
      value: { href: "" },
      writable: true,
    });
  });

  it("isAuthenticated is false when data is undefined", () => {
    mockUseSpotifyAuthStatusQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });

    const { result } = renderHook(() => useSpotifyAuthController());

    expect(result.current.isAuthenticated).toBe(false);
  });

  it("isAuthenticated reflects data.authenticated", () => {
    mockUseSpotifyAuthStatusQuery.mockReturnValue({
      data: { authenticated: true, hasRefreshToken: true },
      isLoading: false,
    });

    const { result } = renderHook(() => useSpotifyAuthController());

    expect(result.current.isAuthenticated).toBe(true);
  });

  it("hasRefreshToken reflects data.hasRefreshToken", () => {
    mockUseSpotifyAuthStatusQuery.mockReturnValue({
      data: { authenticated: true, hasRefreshToken: true },
      isLoading: false,
    });

    const { result } = renderHook(() => useSpotifyAuthController());

    expect(result.current.hasRefreshToken).toBe(true);
  });

  it("isLoading aggregates query isLoading OR mutation isPending", () => {
    mockUseSpotifyAuthStatusQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
    });
    mockUseSpotifyLogoutMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    });

    const { result } = renderHook(() => useSpotifyAuthController());

    expect(result.current.isLoading).toBe(true);
  });

  it("login() sets window.location.href to the login URL", () => {
    const { result } = renderHook(() => useSpotifyAuthController());

    act(() => {
      result.current.login();
    });

    expect(window.location.href).toBe("/api/auth/spotify/login");
  });

  it("logout() calls logoutMutation.mutate()", () => {
    const { result } = renderHook(() => useSpotifyAuthController());

    act(() => {
      result.current.logout();
    });

    expect(mockMutate).toHaveBeenCalledTimes(1);
  });
});
