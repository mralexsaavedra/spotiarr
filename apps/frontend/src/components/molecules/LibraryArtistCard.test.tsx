import { LibraryArtist } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LibraryArtistCard } from "./LibraryArtistCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: string | Record<string, unknown>) => {
      if (key === "library.artistCardAriaLabel") {
        const options = fallbackOrOptions as {
          name: string;
          albums: number;
          tracks: number;
        };

        return `Artist ${options.name}, ${options.albums} albums, ${options.tracks} tracks`;
      }

      return typeof fallbackOrOptions === "string" ? fallbackOrOptions : key;
    },
  }),
}));

describe("LibraryArtistCard", () => {
  const artist: LibraryArtist = {
    name: "Daft Punk",
    path: "/library/daft-punk",
    albumCount: 3,
    trackCount: 25,
    totalSize: 1234,
    image: undefined,
    albums: [],
  };

  it("renders artist name and albums/tracks meta", () => {
    render(<LibraryArtistCard artist={artist} />);

    expect(screen.getByText("Daft Punk")).not.toBeNull();
    expect(screen.getByText(/3\s+Albums\s+·\s+25\s+Tracks/)).not.toBeNull();
  });

  it("fires click handler and provides accessible label", () => {
    const onClick = vi.fn();

    render(<LibraryArtistCard artist={artist} onClick={onClick} />);

    const cardButton = screen.getByRole("button", {
      name: "Artist Daft Punk, 3 albums, 25 tracks",
    });

    fireEvent.click(cardButton);
    expect(onClick).toHaveBeenCalledWith(artist);
  });
});
