import type { LibraryAlbum, LibraryArtist } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LibraryArtistProfile } from "./LibraryArtistProfile";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("../molecules/ArtistHeader", () => ({
  ArtistHeader: ({ name, subtitle }: { name: string; subtitle?: React.ReactNode }) => (
    <div>
      <h1>{name}</h1>
      <div>{subtitle}</div>
    </div>
  ),
}));

vi.mock("./LibraryAlbumList", () => ({
  LibraryAlbumList: ({
    albums,
    onAlbumClick,
  }: {
    albums: LibraryAlbum[];
    artistName: string;
    onAlbumClick: (album: LibraryAlbum) => void;
  }) => (
    <div>
      {albums.map((album) => (
        <button
          key={album.path}
          type="button"
          onClick={() => onAlbumClick(album)}
          aria-label={`open-${album.name}`}
        >
          {album.name}
        </button>
      ))}
    </div>
  ),
}));

const makeAlbum = (name: string): LibraryAlbum => ({
  name,
  path: `/library/artist/${name}`,
  artist: "Test Artist",
  trackCount: 10,
  totalSize: 1000,
  year: 2020,
  tracks: [],
});

const makeArtist = (overrides?: Partial<LibraryArtist>): LibraryArtist => ({
  name: "Daft Punk",
  path: "/library/daft-punk",
  albumCount: 2,
  trackCount: 20,
  totalSize: 5000,
  albums: [makeAlbum("Discovery"), makeAlbum("Random Access Memories")],
  ...overrides,
});

describe("LibraryArtistProfile", () => {
  it("renders the artist name", () => {
    render(<LibraryArtistProfile artist={makeArtist()} onAlbumClick={vi.fn()} />);

    expect(screen.getByText("Daft Punk")).toBeTruthy();
  });

  it("renders one button per album in the list", () => {
    render(<LibraryArtistProfile artist={makeArtist()} onAlbumClick={vi.fn()} />);

    expect(screen.getByRole("button", { name: "open-Discovery" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "open-Random Access Memories" })).toBeTruthy();
  });

  it("calls onAlbumClick with the album name when an album is clicked", () => {
    const onAlbumClick = vi.fn();
    render(<LibraryArtistProfile artist={makeArtist()} onAlbumClick={onAlbumClick} />);

    fireEvent.click(screen.getByRole("button", { name: "open-Discovery" }));

    expect(onAlbumClick).toHaveBeenCalledWith("Discovery");
  });

  it("shows album count in the subtitle", () => {
    render(<LibraryArtistProfile artist={makeArtist({ albumCount: 3 })} onAlbumClick={vi.fn()} />);

    expect(screen.getByText(/3/)).toBeTruthy();
  });

  it("shows track count in the subtitle", () => {
    render(<LibraryArtistProfile artist={makeArtist({ trackCount: 42 })} onAlbumClick={vi.fn()} />);

    expect(screen.getByText(/42/)).toBeTruthy();
  });

  it("renders with empty albums list without crashing", () => {
    render(<LibraryArtistProfile artist={makeArtist({ albums: [] })} onAlbumClick={vi.fn()} />);

    expect(screen.getByText("Daft Punk")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
