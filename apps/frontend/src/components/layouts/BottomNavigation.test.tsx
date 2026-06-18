import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MOBILE_NAV_ITEMS } from "@/config/navigation";
import { Path } from "@/routes/routes";
import { BottomNavigation } from "./BottomNavigation";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const renderNav = (pathname: string) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <BottomNavigation pathname={pathname} />
    </MemoryRouter>,
  );

describe("BottomNavigation", () => {
  it("renders a nav element", () => {
    renderNav(Path.HOME);
    expect(screen.getByRole("navigation")).toBeTruthy();
  });

  it("renders a link for each mobile nav item", () => {
    renderNav(Path.HOME);
    const links = screen.getAllByRole("link");
    expect(links.length).toBe(MOBILE_NAV_ITEMS.length);
  });

  it("renders each nav item label translated via i18n", () => {
    renderNav(Path.HOME);
    for (const item of MOBILE_NAV_ITEMS) {
      expect(screen.getByText(item.labelKey)).toBeTruthy();
    }
  });

  it("applies active text-white class to the current route link", () => {
    renderNav(Path.HOME);
    const homeItem = MOBILE_NAV_ITEMS.find((i) => i.to === Path.HOME)!;
    const homeLink = screen.getByText(homeItem.labelKey).closest("a")!;
    expect(homeLink.className).toContain("text-white");
  });

  it("does not apply text-white to inactive route links", () => {
    renderNav(Path.HOME);
    const releasesItem = MOBILE_NAV_ITEMS.find((i) => i.to === Path.RELEASES)!;
    const releasesLink = screen.getByText(releasesItem.labelKey).closest("a")!;
    expect(releasesLink.className).not.toContain("text-white");
  });

  it("each link points to the correct path", () => {
    renderNav(Path.HOME);
    for (const item of MOBILE_NAV_ITEMS) {
      const link = screen.getByText(item.labelKey).closest("a")!;
      expect(link.getAttribute("href")).toBe(item.to);
    }
  });

  it("does not render Dashboard or Settings in the bottom bar", () => {
    renderNav(Path.HOME);
    expect(MOBILE_NAV_ITEMS.some((i) => i.to === Path.DASHBOARD)).toBe(false);
    expect(MOBILE_NAV_ITEMS.some((i) => i.to === Path.SETTINGS)).toBe(false);
    expect(screen.queryByText("navigation.dashboard")).toBeNull();
    expect(screen.queryByText("navigation.settings")).toBeNull();
  });

  it("renders Home centered among five primary destinations", () => {
    renderNav(Path.HOME);
    expect(MOBILE_NAV_ITEMS.length).toBe(5);
    const homeIndex = MOBILE_NAV_ITEMS.findIndex((i) => i.to === Path.HOME);
    expect(homeIndex).toBe(2);
  });
});
