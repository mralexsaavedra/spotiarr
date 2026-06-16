import { SpotifyPlaylist } from "@spotiarr/shared";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpotifyPlaylistList } from "./SpotifyPlaylistList";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

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

const makePlaylists = (...ids: string[]): SpotifyPlaylist[] =>
  ids.map((id) => ({
    id,
    name: `Playlist ${id}`,
    image: null,
    owner: "test-owner",
    tracks: 10,
    spotifyUrl: `https://open.spotify.com/playlist/${id}`,
  }));

describe("SpotifyPlaylistList", () => {
  it("renders one card per playlist", () => {
    render(<SpotifyPlaylistList playlists={makePlaylists("p1", "p2")} onClick={vi.fn()} />);
    expect(screen.getByText("Playlist p1")).toBeTruthy();
    expect(screen.getByText("Playlist p2")).toBeTruthy();
  });

  it("renders nothing interactive when the list is empty", () => {
    const { container } = render(<SpotifyPlaylistList playlists={[]} onClick={vi.fn()} />);
    expect(container.querySelectorAll("article")).toHaveLength(0);
  });

  it("calls onClick with the playlist id when a card is clicked", () => {
    const onClick = vi.fn();
    render(<SpotifyPlaylistList playlists={makePlaylists("abc")} onClick={onClick} />);

    const article = screen.getByRole("article");
    fireEvent.click(article);

    expect(onClick).toHaveBeenCalledWith("abc");
  });

  it("calls onClick with the correct id for each playlist in a multi-item list", () => {
    const onClick = vi.fn();
    render(<SpotifyPlaylistList playlists={makePlaylists("x1", "x2")} onClick={onClick} />);

    const articles = screen.getAllByRole("article");
    fireEvent.click(articles[1]);

    expect(onClick).toHaveBeenCalledWith("x2");
  });
});
