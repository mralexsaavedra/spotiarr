import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtistCard } from "./ArtistCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => {
      if (key === "artist.type") return "Artist";
      return fallback ?? key;
    },
  }),
}));

describe("ArtistCard", () => {
  const baseProps = {
    id: "artist-1",
    name: "Daft Punk",
    image: null,
    onClick: vi.fn(),
  };

  it("renders name and artist type label", () => {
    render(<ArtistCard {...baseProps} />);

    expect(screen.getByText("Daft Punk")).not.toBeNull();
    expect(screen.getByText("Artist")).not.toBeNull();
  });

  it("exposes the card as an accessible button with the artist name", () => {
    render(<ArtistCard {...baseProps} />);

    const button = screen.getByRole("button", { name: "Daft Punk" });
    expect(button).not.toBeNull();
  });

  it("fires onClick with the artist id when clicked", () => {
    const onClick = vi.fn();
    render(<ArtistCard {...baseProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Daft Punk" }));
    expect(onClick).toHaveBeenCalledWith("artist-1");
  });
});
