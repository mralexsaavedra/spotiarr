import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NotFound } from "./NotFound";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/errors/GenericErrorState", () => ({
  GenericErrorState: ({
    title,
    description,
    onGoHome,
  }: {
    title?: string;
    description?: string;
    onGoHome?: () => void;
  }) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {onGoHome && <button onClick={onGoHome}>Go Home</button>}
    </div>
  ),
}));

describe("NotFound", () => {
  it("renders the page-not-found title and description", () => {
    render(<NotFound />);

    expect(screen.getByText("common.errors.pageNotFound")).toBeTruthy();
    expect(screen.getByText("common.errors.pageNotFoundDesc")).toBeTruthy();
  });

  it("renders a go-home button", () => {
    render(<NotFound />);

    expect(screen.getByRole("button", { name: "Go Home" })).toBeTruthy();
  });

  it("navigates to home when the go-home button is clicked", () => {
    render(<NotFound />);

    fireEvent.click(screen.getByRole("button", { name: "Go Home" }));

    expect(mockNavigate).toHaveBeenCalledWith("/");
  });
});
