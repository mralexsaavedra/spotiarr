import type { ArtistRelease } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ReleasesList } from "./ReleasesList";

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

vi.mock("../molecules/AlbumCard", () => ({
  AlbumCard: ({
    albumName,
    onCardClick,
    onArtistClick,
    artistId,
  }: {
    albumId: string;
    albumName: string;
    artistId: string;
    artistName: string;
    coverUrl: string | null;
    releaseDate?: string;
    albumType?: string;
    onCardClick: () => void;
    onArtistClick: (artistId: string) => void;
  }) => (
    <div>
      <button type="button" onClick={onCardClick} aria-label={`open-${albumName}`}>
        {albumName}
      </button>
      <button
        type="button"
        onClick={() => onArtistClick(artistId)}
        aria-label={`artist-${artistId}`}
      >
        artist-link
      </button>
    </div>
  ),
}));

const makeRelease = (albumId: string, albumName: string, artistId = "artist-1"): ArtistRelease => ({
  albumId,
  albumName,
  artistId,
  artistName: "Test Artist",
  artistImageUrl: null,
  coverUrl: null,
  albumType: "album",
  releaseDate: "2023-01-01",
});

describe("ReleasesList", () => {
  it("renders one card per release", () => {
    const releases = [makeRelease("r1", "Album One"), makeRelease("r2", "Album Two")];
    render(<ReleasesList releases={releases} onReleaseClick={vi.fn()} onArtistClick={vi.fn()} />);

    expect(screen.getByText("Album One")).toBeTruthy();
    expect(screen.getByText("Album Two")).toBeTruthy();
  });

  it("renders nothing when releases list is empty", () => {
    const { container } = render(
      <ReleasesList releases={[]} onReleaseClick={vi.fn()} onArtistClick={vi.fn()} />,
    );

    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("calls onReleaseClick with the correct release when a card is clicked", () => {
    const onReleaseClick = vi.fn();
    const releases = [makeRelease("r1", "Album One")];
    render(
      <ReleasesList releases={releases} onReleaseClick={onReleaseClick} onArtistClick={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "open-Album One" }));

    expect(onReleaseClick).toHaveBeenCalledWith(releases[0]);
  });

  it("calls onArtistClick with the correct artistId when artist link is clicked", () => {
    const onArtistClick = vi.fn();
    const releases = [makeRelease("r1", "Album One", "artist-42")];
    render(
      <ReleasesList releases={releases} onReleaseClick={vi.fn()} onArtistClick={onArtistClick} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "artist-artist-42" }));

    expect(onArtistClick).toHaveBeenCalledWith("artist-42");
  });

  it("renders two cards for two releases", () => {
    const releases = [makeRelease("r1", "Album One"), makeRelease("r2", "Album Two")];
    render(<ReleasesList releases={releases} onReleaseClick={vi.fn()} onArtistClick={vi.fn()} />);

    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(2);
  });
});
