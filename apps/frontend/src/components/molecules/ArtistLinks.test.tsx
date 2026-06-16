import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ArtistLinks } from "./ArtistLinks";

vi.mock("@/utils/spotify", () => ({
  isSpotifyUrl: (url: string) => url.startsWith("https://open.spotify.com"),
  getSpotifyIdFromUrl: (url: string) => url.split("/").pop() ?? null,
}));

vi.mock("@/routes/routes", () => ({
  Path: { ARTIST_DETAIL: "/artist/:id" },
}));

describe("ArtistLinks", () => {
  it("renders artist name as plain text when no url is provided", () => {
    render(
      <MemoryRouter>
        <ArtistLinks artists={[{ name: "Daft Punk" }]} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Daft Punk")).not.toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders a link when artist has a Spotify URL containing the extracted ID", () => {
    render(
      <MemoryRouter>
        <ArtistLinks
          artists={[{ name: "Daft Punk", url: "https://open.spotify.com/artist/abc123" }]}
        />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Daft Punk" });
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toContain("abc123");
  });

  it("renders a link using the last path segment when artist has a non-Spotify URL", () => {
    render(
      <MemoryRouter>
        <ArtistLinks artists={[{ name: "Daft Punk", url: "https://example.com/artists/xyz789" }]} />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Daft Punk" });
    expect(link).not.toBeNull();
    expect(link.getAttribute("href")).toContain("xyz789");
  });

  it("renders multiple artists separated by commas with no trailing comma on the last", () => {
    render(
      <MemoryRouter>
        <ArtistLinks
          artists={[
            { name: "Artist One", url: "https://open.spotify.com/artist/id1" },
            { name: "Artist Two", url: "https://open.spotify.com/artist/id2" },
            { name: "Artist Three" },
          ]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Artist One")).not.toBeNull();
    expect(screen.getByText("Artist Two")).not.toBeNull();
    expect(screen.getByText("Artist Three")).not.toBeNull();

    const container = screen.getByText("Artist One").closest("span")?.parentElement;
    expect(container?.textContent).toContain(", ");
    // Last artist has no trailing comma
    expect(container?.textContent?.endsWith(", ")).toBe(false);
  });

  it("calls onLinkClick when an artist link is clicked", () => {
    const onLinkClick = vi.fn();
    render(
      <MemoryRouter>
        <ArtistLinks
          artists={[{ name: "Daft Punk", url: "https://open.spotify.com/artist/abc123" }]}
          onLinkClick={onLinkClick}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("link", { name: "Daft Punk" }));
    expect(onLinkClick).toHaveBeenCalledTimes(1);
  });

  it("renders a single artist with no comma separator", () => {
    render(
      <MemoryRouter>
        <ArtistLinks artists={[{ name: "Solo Artist" }]} />
      </MemoryRouter>,
    );

    const text = screen.getByText("Solo Artist").closest("span")?.parentElement?.textContent;
    expect(text).not.toContain(",");
  });
});
