import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";
import { AppHeader } from "./AppHeader";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

const mockController = {
  url: "",
  handleSubmit: vi.fn(),
  isPending: false,
  isValidUrl: false,
  handleChangeUrl: vi.fn(),
  handleKeyUp: vi.fn(),
};

vi.mock("@/hooks/controllers/useHeaderController", () => ({
  useHeaderController: () => mockController,
}));

const renderHeader = () =>
  render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>,
  );

describe("AppHeader", () => {
  beforeEach(() => {
    mockController.url = "";
    mockController.isValidUrl = false;
    mockController.isPending = false;
  });

  it("renders the search input", () => {
    renderHeader();
    expect(screen.getByRole("textbox")).toBeTruthy();
  });

  it("renders the SpotiArr logo image", () => {
    renderHeader();
    expect(screen.getByAltText("SpotiArr Logo")).toBeTruthy();
  });

  it("does not render the submit button when url is empty", () => {
    renderHeader();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders submit button when url is non-empty", () => {
    mockController.url = "https://open.spotify.com/playlist/123";
    renderHeader();
    expect(screen.getByRole("button")).toBeTruthy();
  });

  it("submit button is disabled when isPending is true", () => {
    mockController.url = "https://open.spotify.com/playlist/123";
    mockController.isPending = true;
    renderHeader();
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders at least one navigation link", () => {
    renderHeader();
    expect(screen.getAllByRole("link").length).toBeGreaterThanOrEqual(1);
  });

  it("reserves no submit-button padding while the input is empty", () => {
    renderHeader();
    expect((screen.getByRole("textbox") as HTMLInputElement).className).toContain("pr-4");
  });

  it("reserves submit-button padding once the input has a value", () => {
    mockController.url = "https://open.spotify.com/playlist/123";
    renderHeader();
    expect((screen.getByRole("textbox") as HTMLInputElement).className).toContain("pr-16");
  });

  it("renders History and Settings as secondary destinations", () => {
    renderHeader();
    expect(screen.getByLabelText("History").getAttribute("href")).toBe(Path.HISTORY);
    expect(screen.getByLabelText("Settings").getAttribute("href")).toBe(Path.SETTINGS);
  });
});
