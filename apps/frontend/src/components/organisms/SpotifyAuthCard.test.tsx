import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSpotifyAuthController } from "@/hooks/controllers/useSpotifyAuthController";
import { SpotifyAuthCard } from "./SpotifyAuthCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("@/hooks/controllers/useSpotifyAuthController");

vi.mock("../skeletons/SpotifyAuthCardSkeleton", () => ({
  SpotifyAuthCardSkeleton: () => <div data-testid="auth-skeleton" />,
}));

const mockUseSpotifyAuthController = vi.mocked(useSpotifyAuthController);

const notAuthLoading = () =>
  mockUseSpotifyAuthController.mockReturnValue({
    isAuthenticated: false,
    hasRefreshToken: false,
    isLoading: true,
    login: vi.fn(),
    logout: vi.fn(),
  });

const notAuth = (overrides?: { login?: () => void; logout?: () => void }) =>
  mockUseSpotifyAuthController.mockReturnValue({
    isAuthenticated: false,
    hasRefreshToken: false,
    isLoading: false,
    login: overrides?.login ?? vi.fn(),
    logout: overrides?.logout ?? vi.fn(),
  });

const authenticated = (overrides?: { login?: () => void; logout?: () => void }) =>
  mockUseSpotifyAuthController.mockReturnValue({
    isAuthenticated: true,
    hasRefreshToken: true,
    isLoading: false,
    login: overrides?.login ?? vi.fn(),
    logout: overrides?.logout ?? vi.fn(),
  });

describe("SpotifyAuthCard", () => {
  it("renders skeleton while loading", () => {
    notAuthLoading();

    render(<SpotifyAuthCard />);

    expect(screen.getByTestId("auth-skeleton")).toBeTruthy();
    expect(screen.queryByText("auth.title")).toBeNull();
  });

  it("renders connect button when not authenticated", () => {
    notAuth();

    render(<SpotifyAuthCard />);

    expect(screen.getByRole("button", { name: /auth\.connectButton/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /auth\.disconnectButton/i })).toBeNull();
  });

  it("renders disconnect button when authenticated", () => {
    authenticated();

    render(<SpotifyAuthCard />);

    expect(screen.getByRole("button", { name: /auth\.disconnectButton/i })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /auth\.connectButton/i })).toBeNull();
  });

  it("calls login when connect button is clicked", () => {
    const login = vi.fn();
    notAuth({ login });

    render(<SpotifyAuthCard />);

    fireEvent.click(screen.getByRole("button", { name: /auth\.connectButton/i }));

    expect(login).toHaveBeenCalledTimes(1);
  });

  it("calls logout when disconnect button is clicked", () => {
    const logout = vi.fn();
    authenticated({ logout });

    render(<SpotifyAuthCard />);

    fireEvent.click(screen.getByRole("button", { name: /auth\.disconnectButton/i }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("shows disconnected status text when not authenticated", () => {
    notAuth();

    render(<SpotifyAuthCard />);

    expect(screen.getByText("auth.disconnectedStatus")).toBeTruthy();
    expect(screen.getByText("auth.disconnectedDescription")).toBeTruthy();
  });

  it("shows connected status text when authenticated", () => {
    authenticated();

    render(<SpotifyAuthCard />);

    expect(screen.getByText("auth.connectedStatus")).toBeTruthy();
    expect(screen.getByText("auth.connectedDescription")).toBeTruthy();
  });

  it("shows info panel only when not authenticated", () => {
    notAuth();

    render(<SpotifyAuthCard />);

    expect(screen.getByText("auth.whyConnect")).toBeTruthy();
  });

  it("does not show info panel when authenticated", () => {
    authenticated();

    render(<SpotifyAuthCard />);

    expect(screen.queryByText("auth.whyConnect")).toBeNull();
  });
});
