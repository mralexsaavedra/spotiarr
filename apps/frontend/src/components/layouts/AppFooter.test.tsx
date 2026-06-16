import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppFooter } from "./AppFooter";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/config/version", () => ({ APP_VERSION: "1.2.3" }));
vi.mock("@/config/links", () => ({
  BUY_ME_A_COFFEE_URL: "https://buymeacoffee.com/test",
  GITHUB_RELEASE_URL: "https://github.com/test/releases/tag/v1.2.3",
}));

describe("AppFooter (expanded)", () => {
  it("renders version text", () => {
    render(<AppFooter />);
    expect(screen.getByText(/1\.2\.3/)).toBeTruthy();
  });

  it("renders buy-me-a-coffee link with i18n label", () => {
    render(<AppFooter />);
    expect(screen.getByText("navigation.buyMeCoffee")).toBeTruthy();
  });

  it("buy-me-a-coffee link opens in a new tab", () => {
    render(<AppFooter />);
    const link = screen.getByText("navigation.buyMeCoffee").closest("a");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toContain("noopener");
  });
});

describe("AppFooter (collapsed)", () => {
  it("renders icon-only coffee link with title when collapsed", () => {
    render(<AppFooter collapsed />);
    const coffeeLink = screen.getByTitle("navigation.buyMeCoffee");
    expect(coffeeLink).toBeTruthy();
  });

  it("renders version anchor with title when collapsed", () => {
    render(<AppFooter collapsed />);
    expect(screen.getByTitle("SpotiArr v1.2.3")).toBeTruthy();
  });

  it("does not render the full 'navigation.buyMeCoffee' text when collapsed", () => {
    render(<AppFooter collapsed />);
    // Text node inside the link should not exist in collapsed state
    expect(screen.queryByText("navigation.buyMeCoffee")).toBeNull();
  });
});
