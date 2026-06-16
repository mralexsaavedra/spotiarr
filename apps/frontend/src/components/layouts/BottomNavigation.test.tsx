import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { MOBILE_NAV_ITEMS } from "@/config/navigation";
import { Path } from "@/routes/routes";
import { BottomNavigation } from "./BottomNavigation";

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

  it("renders each nav item label", () => {
    renderNav(Path.HOME);
    for (const item of MOBILE_NAV_ITEMS) {
      expect(screen.getByText(item.label)).toBeTruthy();
    }
  });

  it("applies active text-white class to the current route link", () => {
    renderNav(Path.HOME);
    const homeItem = MOBILE_NAV_ITEMS.find((i) => i.to === Path.HOME)!;
    const homeLink = screen.getByText(homeItem.label).closest("a")!;
    expect(homeLink.className).toContain("text-white");
  });

  it("does not apply text-white to inactive route links", () => {
    renderNav(Path.HOME);
    const historyItem = MOBILE_NAV_ITEMS.find((i) => i.to === Path.HISTORY)!;
    const historyLink = screen.getByText(historyItem.label).closest("a")!;
    expect(historyLink.className).not.toContain("text-white");
  });

  it("each link points to the correct path", () => {
    renderNav(Path.HOME);
    for (const item of MOBILE_NAV_ITEMS) {
      const link = screen.getByText(item.label).closest("a")!;
      expect(link.getAttribute("href")).toBe(item.to);
    }
  });
});
