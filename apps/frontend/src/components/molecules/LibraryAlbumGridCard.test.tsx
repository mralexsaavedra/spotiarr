import { LibraryAlbum } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LibraryAlbumGridCard } from "./LibraryAlbumGridCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: string | Record<string, unknown>) => {
      if (key === "library.albumCardAriaLabel") {
        const options = fallbackOrOptions as {
          name: string;
          artist: string;
          year: number;
          tracks: number;
        };

        return `Album ${options.name} by ${options.artist}, ${options.year}, ${options.tracks} tracks`;
      }

      return typeof fallbackOrOptions === "string" ? fallbackOrOptions : key;
    },
  }),
}));

describe("LibraryAlbumGridCard", () => {
  const album: LibraryAlbum = {
    name: "Random Access Memories",
    path: "/library/daft-punk/ram",
    artist: "Daft Punk",
    trackCount: 13,
    totalSize: 4321,
    year: 2013,
    image: undefined,
    tracks: [],
  };

  it("renders album fields", () => {
    render(<LibraryAlbumGridCard album={album} artistName="Daft Punk" onClick={vi.fn()} />);

    expect(screen.getByText("Random Access Memories")).not.toBeNull();
    expect(screen.getByText("2013 · 13 Tracks")).not.toBeNull();
  });

  it("fires click handler with album and has no download overlay", () => {
    const onClick = vi.fn();

    render(<LibraryAlbumGridCard album={album} artistName="Daft Punk" onClick={onClick} />);

    const cardButton = screen.getByRole("button", {
      name: "Album Random Access Memories by Daft Punk, 2013, 13 tracks",
    });

    fireEvent.click(cardButton);

    expect(onClick).toHaveBeenCalledWith(album);
    expect(screen.queryByRole("button", { name: /download/i })).toBeNull();
  });
});
