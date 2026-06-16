import { ArtistRelease } from "@spotiarr/shared";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchAlbumGrid } from "./SearchAlbumGrid";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) =>
        opts ? `${key}:${JSON.stringify(opts)}` : key,
    }),
  };
});

vi.mock("@/hooks/useAlbumListDownloadStates", () => ({
  useAlbumListDownloadStates: () =>
    new Map<string, { isDownloaded: boolean; isDownloading: boolean }>(),
}));

vi.mock("../molecules/VirtualGrid", () => ({
  VirtualGrid: <T,>({
    items,
    renderItem,
    itemKey,
  }: {
    items: T[];
    renderItem: (item: T) => React.ReactNode;
    itemKey: (item: T) => string;
  }) => (
    <div>
      {items.map((item) => (
        <div key={itemKey(item)}>{renderItem(item)}</div>
      ))}
    </div>
  ),
}));

const makeAlbum = (albumId: string, albumName = `Album ${albumId}`): ArtistRelease => ({
  albumId,
  albumName,
  artistId: `artist-${albumId}`,
  artistName: "Test Artist",
  artistImageUrl: null,
  coverUrl: null,
  spotifyUrl: `https://open.spotify.com/album/${albumId}`,
  totalTracks: 10,
});

describe("SearchAlbumGrid", () => {
  it("renders one card per album", () => {
    render(
      <SearchAlbumGrid
        albums={[makeAlbum("a1"), makeAlbum("a2")]}
        onClick={vi.fn()}
        onArtistClick={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    expect(screen.getByText("Album a1")).toBeTruthy();
    expect(screen.getByText("Album a2")).toBeTruthy();
  });

  it("renders nothing when the albums list is empty", () => {
    const { container } = render(
      <SearchAlbumGrid
        albums={[]}
        onClick={vi.fn()}
        onArtistClick={vi.fn()}
        onDownload={vi.fn()}
      />,
    );
    expect(container.querySelectorAll("article")).toHaveLength(0);
  });

  it("calls onClick with spotifyUrl, artistId, albumId when the card button is clicked", () => {
    const onClick = vi.fn();
    render(
      <SearchAlbumGrid
        albums={[makeAlbum("b1", "Beach Album")]}
        onClick={onClick}
        onArtistClick={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    // AlbumCard renders a button with aria-label containing the album name
    const cardBtn = screen.getByRole("button", { name: /Beach Album/i });
    fireEvent.click(cardBtn);

    expect(onClick).toHaveBeenCalledWith({
      spotifyUrl: "https://open.spotify.com/album/b1",
      artistId: "artist-b1",
      albumId: "b1",
    });
  });

  it("calls onArtistClick with artistId when the artist button is clicked", () => {
    const onArtistClick = vi.fn();
    render(
      <SearchAlbumGrid
        albums={[makeAlbum("c1")]}
        onClick={vi.fn()}
        onArtistClick={onArtistClick}
        onDownload={vi.fn()}
      />,
    );

    // AlbumCard renders an artist <button> whose text content is the artist name.
    // The card itself is a separate button with a compound aria-label.
    // We select the button whose accessible name IS exactly the artist name text.
    const buttons = screen.getAllByRole("button");
    const artistBtn = buttons.find((btn) => btn.textContent?.trim() === "Test Artist")!;
    fireEvent.click(artistBtn);

    expect(onArtistClick).toHaveBeenCalledWith("artist-c1");
  });
});
