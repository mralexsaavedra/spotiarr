import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MostListenedPlaceholder } from "./MostListenedPlaceholder";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

describe("MostListenedPlaceholder", () => {
  it("renders a heading for most listened section", () => {
    render(<MostListenedPlaceholder />);

    expect(screen.getByRole("heading")).toBeTruthy();
  });

  it("renders the mostListenedTitle i18n key", () => {
    render(<MostListenedPlaceholder />);

    expect(screen.getByText("dashboard.mostListenedTitle")).toBeTruthy();
  });

  it("renders the mostListenedComingSoon i18n key", () => {
    render(<MostListenedPlaceholder />);

    expect(screen.getByText("dashboard.mostListenedComingSoon")).toBeTruthy();
  });

  it("makes no backend calls — purely static", () => {
    render(<MostListenedPlaceholder />);

    expect(screen.queryByTestId("loading")).toBeNull();
  });
});
