import type { LibraryAlbum, LibraryArtist } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { ComponentProps } from "react";
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

const renderProfile = (props?: Partial<ComponentProps<typeof LibraryArtistProfile>>) =>
  render(
    <LibraryArtistProfile
      artist={makeArtist()}
      onAlbumClick={vi.fn()}
      albumSearch=""
      onAlbumSearchChange={vi.fn()}
      noAlbumResults={false}
      {...props}
    />,
  );

describe("LibraryArtistProfile", () => {
  it("renders the artist name", () => {
    renderProfile();

    expect(screen.getByText("Daft Punk")).toBeTruthy();
  });

  it("renders one button per album in the list", () => {
    renderProfile();

    expect(screen.getByRole("button", { name: "open-Discovery" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "open-Random Access Memories" })).toBeTruthy();
  });

  it("calls onAlbumClick with the album name when an album is clicked", () => {
    const onAlbumClick = vi.fn();
    renderProfile({ onAlbumClick });

    fireEvent.click(screen.getByRole("button", { name: "open-Discovery" }));

    expect(onAlbumClick).toHaveBeenCalledWith("Discovery");
  });

  it("shows album count in the subtitle", () => {
    renderProfile({ artist: makeArtist({ albumCount: 3 }) });

    expect(screen.getByText(/3/)).toBeTruthy();
  });

  it("shows track count in the subtitle", () => {
    renderProfile({ artist: makeArtist({ trackCount: 42 }) });

    expect(screen.getByText(/42/)).toBeTruthy();
  });

  it("renders with empty albums list without crashing", () => {
    renderProfile({ artist: makeArtist({ albums: [] }) });

    expect(screen.getByText("Daft Punk")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders the album search input in the section heading", () => {
    renderProfile();

    expect(screen.getByPlaceholderText("Search albums...")).toBeTruthy();
  });

  it("calls onAlbumSearchChange when typing in the search input", () => {
    const onAlbumSearchChange = vi.fn();
    renderProfile({ onAlbumSearchChange });

    fireEvent.change(screen.getByPlaceholderText("Search albums..."), {
      target: { value: "disco" },
    });

    expect(onAlbumSearchChange).toHaveBeenCalledWith("disco");
  });

  it("shows the no-results state instead of the album list when noAlbumResults is true", () => {
    renderProfile({ albumSearch: "zzz", noAlbumResults: true });

    expect(screen.getByText("No albums found")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "open-Discovery" })).toBeNull();
  });
});
