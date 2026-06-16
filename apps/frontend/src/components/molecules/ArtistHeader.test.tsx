import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtistHeader } from "./ArtistHeader";

describe("ArtistHeader", () => {
  it("renders the artist name", () => {
    render(<ArtistHeader name="Daft Punk" />);
    expect(screen.getByText("Daft Punk")).not.toBeNull();
  });

  it("wraps name in an anchor with correct href and target='_blank' when spotifyUrl is provided", () => {
    render(<ArtistHeader name="Daft Punk" spotifyUrl="https://open.spotify.com/artist/123" />);

    const link = screen.getByRole("link", { name: "Daft Punk" });
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toBe("https://open.spotify.com/artist/123");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("renders name as plain text without an anchor when spotifyUrl is not provided", () => {
    render(<ArtistHeader name="Daft Punk" />);

    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Daft Punk")).not.toBeNull();
  });

  it("renders subtitle when provided", () => {
    render(<ArtistHeader name="Daft Punk" subtitle="Electronic duo from Paris" />);
    expect(screen.getByText("Electronic duo from Paris")).not.toBeNull();
  });

  it("does not render subtitle when omitted", () => {
    render(<ArtistHeader name="Daft Punk" />);
    expect(screen.queryByText("Electronic duo from Paris")).toBeNull();
  });
});
