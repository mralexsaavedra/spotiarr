import type { LibraryArtist } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { LibraryArtistList } from "./LibraryArtistList";

vi.mock("../molecules/VirtualGrid", () => ({
  VirtualGrid: <T,>({
    items,
    itemKey,
    renderItem,
  }: {
    items: T[];
    itemKey: (item: T) => string;
    renderItem: (item: T) => ReactNode;
  }) => (
    <div>
      {items.map((item) => (
        <div key={itemKey(item)}>{renderItem(item)}</div>
      ))}
    </div>
  ),
}));

vi.mock("../molecules/LibraryArtistCard", () => ({
  LibraryArtistCard: ({
    artist,
    onClick,
  }: {
    artist: LibraryArtist;
    onClick?: (artist: LibraryArtist) => void;
  }) => (
    <button type="button" onClick={() => onClick?.(artist)} aria-label={`open-${artist.name}`}>
      {artist.name}
    </button>
  ),
}));

const makeArtist = (name: string, path: string): LibraryArtist => ({
  name,
  path,
  albumCount: 2,
  trackCount: 20,
  totalSize: 5000,
  albums: [],
});

describe("LibraryArtistList", () => {
  it("renders one card per artist", () => {
    const artists = [
      makeArtist("Daft Punk", "/library/daft-punk"),
      makeArtist("Radiohead", "/library/radiohead"),
    ];
    render(<LibraryArtistList artists={artists} />);

    expect(screen.getByText("Daft Punk")).toBeTruthy();
    expect(screen.getByText("Radiohead")).toBeTruthy();
  });

  it("renders nothing when artists list is empty", () => {
    const { container } = render(<LibraryArtistList artists={[]} />);

    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("calls onArtistClick with the correct artist when a card is clicked", () => {
    const onArtistClick = vi.fn();
    const artists = [makeArtist("Daft Punk", "/library/daft-punk")];
    render(<LibraryArtistList artists={artists} onArtistClick={onArtistClick} />);

    fireEvent.click(screen.getByRole("button", { name: "open-Daft Punk" }));

    expect(onArtistClick).toHaveBeenCalledWith(artists[0]);
  });

  it("renders two cards for two artists", () => {
    const artists = [
      makeArtist("Daft Punk", "/library/daft-punk"),
      makeArtist("Radiohead", "/library/radiohead"),
    ];
    render(<LibraryArtistList artists={artists} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("works without onArtistClick prop (optional)", () => {
    const artists = [makeArtist("Daft Punk", "/library/daft-punk")];
    expect(() => {
      render(<LibraryArtistList artists={artists} />);
      fireEvent.click(screen.getByRole("button", { name: "open-Daft Punk" }));
    }).not.toThrow();
  });
});
