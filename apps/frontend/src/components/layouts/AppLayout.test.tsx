import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";
import { AppLayout } from "./AppLayout";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("@/config/version", () => ({ APP_VERSION: "1.0.0" }));
vi.mock("@/config/links", () => ({
  BUY_ME_A_COFFEE_URL: "https://buymeacoffee.com/test",
  GITHUB_RELEASE_URL: "https://github.com/test/releases",
}));

const mockUsePreferencesStore = vi.fn(() => ({
  isSidebarCollapsed: false,
  toggleSidebar: vi.fn(),
  setSidebarCollapsed: vi.fn(),
}));

vi.mock("@/store/usePreferencesStore", () => ({
  usePreferencesStore: () => mockUsePreferencesStore(),
}));

vi.mock("@/hooks/controllers/useHeaderController", () => ({
  useHeaderController: () => ({
    url: "",
    handleSubmit: vi.fn(),
    isPending: false,
    isValidUrl: false,
    handleChangeUrl: vi.fn(),
    handleKeyUp: vi.fn(),
  }),
}));

// Stub the GlobalPlayerBar — it has heavy store/audio dependencies
vi.mock("../organisms/GlobalPlayerBar", () => ({
  GlobalPlayerBar: () => <div data-testid="global-player-bar" />,
}));

// react-router-dom Outlet renders matched child routes; stub it for unit tests
vi.mock("react-router-dom", async (importActual) => {
  const actual = await importActual<typeof import("react-router-dom")>();
  return {
    ...actual,
    Outlet: () => <div data-testid="outlet" />,
  };
});

const renderLayout = (pathname: Path = Path.HOME) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <AppLayout pathname={pathname} version="1.0.0" />
    </MemoryRouter>,
  );

describe("AppLayout", () => {
  it("renders without crashing", () => {
    const { container } = renderLayout();
    expect(container.firstChild).toBeTruthy();
  });

  it("renders the Outlet placeholder", () => {
    renderLayout();
    expect(screen.getByTestId("outlet")).toBeTruthy();
  });

  it("renders the GlobalPlayerBar", () => {
    renderLayout();
    expect(screen.getByTestId("global-player-bar")).toBeTruthy();
  });

  it("renders a main element for the page content area", () => {
    renderLayout();
    expect(screen.getByRole("main")).toBeTruthy();
  });

  it("renders the navigation (Sidebar)", () => {
    renderLayout();
    // Sidebar renders an <aside> — check via complementary role or just landmark
    const { container } = renderLayout();
    expect(container.querySelector("aside")).toBeTruthy();
  });

  it("applies collapsed margin class when sidebar is collapsed", () => {
    mockUsePreferencesStore.mockReturnValueOnce({
      isSidebarCollapsed: true,
      toggleSidebar: vi.fn(),
      setSidebarCollapsed: vi.fn(),
    });
    const { getByRole } = renderLayout();
    expect(getByRole("main").className).toContain("md:ml-20");
  });
});
