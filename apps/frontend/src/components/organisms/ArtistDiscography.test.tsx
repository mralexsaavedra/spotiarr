import type { ArtistRelease } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ArtistDiscography } from "./ArtistDiscography";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("../molecules/VirtualGrid", () => ({
  VirtualGrid: <T,>({
    items,
    itemKey,
    renderItem,
    footer,
  }: {
    items: T[];
    itemKey: (item: T) => string;
    renderItem: (item: T) => ReactNode;
    footer?: ReactNode;
  }) => (
    <div>
      {items.map((item) => (
        <div key={itemKey(item)}>{renderItem(item)}</div>
      ))}
      {footer}
    </div>
  ),
}));

vi.mock("../molecules/AlbumCard", () => ({
  AlbumCard: ({
    albumName,
    onCardClick,
  }: {
    albumId: string;
    albumName: string;
    onCardClick: () => void;
    onArtistClick: (artistId: string) => void;
  }) => (
    <button type="button" onClick={onCardClick}>
      {albumName}
    </button>
  ),
}));

vi.mock("../molecules/ArtistDiscographyFilters", () => ({
  ArtistDiscographyFilters: ({
    onFilterChange,
  }: {
    currentFilter: string;
    onFilterChange: (f: string) => void;
  }) => (
    <button type="button" onClick={() => onFilterChange("single")}>
      change-filter
    </button>
  ),
}));

const makeRelease = (albumId: string, albumName: string): ArtistRelease => ({
  albumId,
  albumName,
  artistId: "artist-1",
  artistName: "Test Artist",
  artistImageUrl: null,
  coverUrl: null,
  albumType: "album",
  releaseDate: "2023-01-01",
});

const defaultProps = {
  filter: "all" as const,
  onFilterChange: vi.fn(),
  filteredAlbums: [makeRelease("a1", "Album One"), makeRelease("a2", "Album Two")],
  visibleItems: 10,
  isLoadingMore: false,
  onShowMore: vi.fn(),
  canShowMore: false,
  onDiscographyItemClick: vi.fn(),
  onArtistClick: vi.fn(),
};

describe("ArtistDiscography", () => {
  it("renders one card per album in the list", () => {
    render(<ArtistDiscography {...defaultProps} />);

    expect(screen.getByText("Album One")).toBeTruthy();
    expect(screen.getByText("Album Two")).toBeTruthy();
  });

  it("shows empty state when filteredAlbums is empty", () => {
    render(<ArtistDiscography {...defaultProps} filteredAlbums={[]} />);

    expect(screen.getByText("artist.discography.emptyFiltered")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Album One" })).toBeNull();
  });

  it("calls onDiscographyItemClick when an album card is clicked", () => {
    const onDiscographyItemClick = vi.fn();
    render(<ArtistDiscography {...defaultProps} onDiscographyItemClick={onDiscographyItemClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Album One" }));

    expect(onDiscographyItemClick).toHaveBeenCalledWith(defaultProps.filteredAlbums[0]);
  });

  it("renders Show More button when canShowMore is true", () => {
    render(<ArtistDiscography {...defaultProps} canShowMore={true} />);

    expect(screen.getByText("artist.discography.showMore")).toBeTruthy();
  });

  it("calls onShowMore when Show More button is clicked", () => {
    const onShowMore = vi.fn();
    render(<ArtistDiscography {...defaultProps} canShowMore={true} onShowMore={onShowMore} />);

    fireEvent.click(screen.getByText("artist.discography.showMore"));

    expect(onShowMore).toHaveBeenCalledTimes(1);
  });

  it("does not render Show More button when canShowMore is false", () => {
    render(<ArtistDiscography {...defaultProps} canShowMore={false} />);

    expect(screen.queryByText("artist.discography.showMore")).toBeNull();
  });

  it("slices albums to visibleItems count", () => {
    const albums = [
      makeRelease("a1", "Album One"),
      makeRelease("a2", "Album Two"),
      makeRelease("a3", "Album Three"),
    ];
    render(<ArtistDiscography {...defaultProps} filteredAlbums={albums} visibleItems={2} />);

    expect(screen.getByText("Album One")).toBeTruthy();
    expect(screen.getByText("Album Two")).toBeTruthy();
    expect(screen.queryByText("Album Three")).toBeNull();
  });

  it("calls onFilterChange when filter is changed", () => {
    const onFilterChange = vi.fn();
    render(<ArtistDiscography {...defaultProps} onFilterChange={onFilterChange} />);

    fireEvent.click(screen.getByRole("button", { name: "change-filter" }));

    expect(onFilterChange).toHaveBeenCalledWith("single");
  });
});
