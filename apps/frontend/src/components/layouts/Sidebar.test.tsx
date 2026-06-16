import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NAV_ITEMS } from "@/config/navigation";
import { Path } from "@/routes/routes";
import { Sidebar } from "./Sidebar";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/config/version", () => ({ APP_VERSION: "1.0.0" }));
vi.mock("@/config/links", () => ({
  BUY_ME_A_COFFEE_URL: "https://buymeacoffee.com/test",
  GITHUB_RELEASE_URL: "https://github.com/test/releases/tag/v1.0.0",
}));

const mockToggleSidebar = vi.fn();
const mockStore = { isSidebarCollapsed: false, toggleSidebar: mockToggleSidebar };

vi.mock("@/store/usePreferencesStore", () => ({
  usePreferencesStore: () => mockStore,
}));

const renderSidebar = (pathname: string = Path.HOME) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Sidebar pathname={pathname} version="1.0.0" />
    </MemoryRouter>,
  );

describe("Sidebar (expanded)", () => {
  beforeEach(() => {
    mockStore.isSidebarCollapsed = false;
    mockToggleSidebar.mockClear();
  });

  it("renders the SpotiArr logo link", () => {
    renderSidebar();
    expect(screen.getByAltText("SpotiArr Logo")).toBeTruthy();
  });

  it("renders a nav element", () => {
    renderSidebar();
    expect(screen.getByRole("navigation")).toBeTruthy();
  });

  it("renders all navigation item labels", () => {
    renderSidebar();
    // Labels are translated via t(key) which returns the key
    // Check that all nav items have their translated labels rendered
    expect(screen.getByText("navigation.home")).toBeTruthy();
    expect(screen.getByText("navigation.history")).toBeTruthy();
    expect(screen.getByText("navigation.settings")).toBeTruthy();
  });

  it("renders a nav link for each NAV_ITEM", () => {
    renderSidebar();
    const links = screen.getAllByRole("link");
    // +1 for the logo link
    expect(links.length).toBeGreaterThanOrEqual(NAV_ITEMS.length);
  });

  it("applies active style to the current route link", () => {
    renderSidebar(Path.HOME);
    const homeLabel = screen.getByText("navigation.home");
    const homeLink = homeLabel.closest("a")!;
    expect(homeLink.className).toContain("bg-background-hover");
  });

  it("does not apply active style to an inactive route link", () => {
    renderSidebar(Path.HOME);
    const historyLabel = screen.getByText("navigation.history");
    const historyLink = historyLabel.closest("a")!;
    expect(historyLink.className).not.toContain("bg-background-hover");
  });

  it("renders the collapse toggle button", () => {
    renderSidebar();
    expect(screen.getByTitle("navigation.collapse")).toBeTruthy();
  });

  it("calls toggleSidebar when the collapse button is clicked", () => {
    renderSidebar();
    fireEvent.click(screen.getByTitle("navigation.collapse"));
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it("renders collapse label text when expanded", () => {
    renderSidebar();
    expect(screen.getByText("navigation.collapse")).toBeTruthy();
  });
});

describe("Sidebar (collapsed)", () => {
  beforeEach(() => {
    mockStore.isSidebarCollapsed = true;
    mockToggleSidebar.mockClear();
  });

  it("renders the expand button when collapsed", () => {
    renderSidebar();
    expect(screen.getByTitle("navigation.expand")).toBeTruthy();
  });

  it("does not render visible nav label text when collapsed", () => {
    renderSidebar();
    // Spans with nav labels should not be in the DOM when collapsed
    expect(screen.queryByText("navigation.home")).toBeNull();
  });
});
