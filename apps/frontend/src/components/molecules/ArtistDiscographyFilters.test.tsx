import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtistDiscographyFilters } from "./ArtistDiscographyFilters";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../atoms/Button", () => ({
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>
      {children}
    </button>
  ),
}));

describe("ArtistDiscographyFilters", () => {
  const onFilterChange = vi.fn();

  it("renders all 3 filter buttons", () => {
    render(<ArtistDiscographyFilters currentFilter="all" onFilterChange={onFilterChange} />);

    expect(screen.getByText("common.cards.albumTypes.all")).not.toBeNull();
    expect(screen.getByText("common.cards.albumTypes.album")).not.toBeNull();
    expect(screen.getByText("common.cards.albumTypes.singlesAndEps")).not.toBeNull();
  });

  it("calls onFilterChange with 'all' when all button is clicked", () => {
    const handler = vi.fn();
    render(<ArtistDiscographyFilters currentFilter="album" onFilterChange={handler} />);

    fireEvent.click(screen.getByText("common.cards.albumTypes.all"));
    expect(handler).toHaveBeenCalledWith("all");
  });

  it("calls onFilterChange with 'album' when album button is clicked", () => {
    const handler = vi.fn();
    render(<ArtistDiscographyFilters currentFilter="all" onFilterChange={handler} />);

    fireEvent.click(screen.getByText("common.cards.albumTypes.album"));
    expect(handler).toHaveBeenCalledWith("album");
  });

  it("calls onFilterChange with 'single' when single button is clicked", () => {
    const handler = vi.fn();
    render(<ArtistDiscographyFilters currentFilter="all" onFilterChange={handler} />);

    fireEvent.click(screen.getByText("common.cards.albumTypes.singlesAndEps"));
    expect(handler).toHaveBeenCalledWith("single");
  });

  it("active filter button has class containing 'bg-white'", () => {
    render(<ArtistDiscographyFilters currentFilter="album" onFilterChange={onFilterChange} />);

    const albumButton = screen.getByText("common.cards.albumTypes.album").closest("button");
    expect(albumButton?.className).toContain("bg-white");
  });

  it("inactive buttons do not have 'bg-white' class", () => {
    render(<ArtistDiscographyFilters currentFilter="album" onFilterChange={onFilterChange} />);

    const allButton = screen.getByText("common.cards.albumTypes.all").closest("button");
    expect(allButton?.className).not.toContain("bg-white");

    const singleButton = screen
      .getByText("common.cards.albumTypes.singlesAndEps")
      .closest("button");
    expect(singleButton?.className).not.toContain("bg-white");
  });
});
