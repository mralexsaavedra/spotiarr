import { LibraryAlbum } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { LibraryAlbumList } from "./LibraryAlbumList";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("../molecules/LibraryAlbumGridCard", () => ({
  LibraryAlbumGridCard: ({
    album,
    onClick,
  }: {
    album: LibraryAlbum;
    artistName: string;
    onClick: (album: LibraryAlbum) => void;
  }) => (
    <button type="button" onClick={() => onClick(album)} aria-label={`open-${album.name}`}>
      {album.name}
    </button>
  ),
}));

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

describe("LibraryAlbumList", () => {
  const albums: LibraryAlbum[] = [
    {
      name: "Discovery",
      path: "/library/daft-punk/discovery",
      artist: "Daft Punk",
      trackCount: 14,
      totalSize: 2000,
      year: 2001,
      image: undefined,
      tracks: [
        {
          fileName: "01.mp3",
          filePath: "/tmp/01.mp3",
          trackNumber: 1,
          name: "One More Time",
          artist: "Daft Punk",
          album: "Discovery",
          format: "mp3",
          size: 100,
          modifiedAt: 1,
        },
      ],
    },
  ];

  it("renders cards and calls onAlbumClick without inline expand behavior", () => {
    const onAlbumClick = vi.fn();

    render(<LibraryAlbumList albums={albums} artistName="Daft Punk" onAlbumClick={onAlbumClick} />);

    fireEvent.click(screen.getByRole("button", { name: "open-Discovery" }));

    expect(onAlbumClick).toHaveBeenCalledWith(albums[0]);
    expect(screen.queryByText("One More Time")).toBeNull();
  });
});
