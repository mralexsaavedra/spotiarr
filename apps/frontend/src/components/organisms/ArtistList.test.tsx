import type { FollowedArtist } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ArtistList } from "./ArtistList";

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

vi.mock("../molecules/ArtistCard", () => ({
  ArtistCard: ({
    id,
    name,
    onClick,
  }: {
    id: string;
    name: string;
    image: string | null;
    spotifyUrl: string | null;
    onClick: (id: string) => void;
  }) => (
    <button type="button" onClick={() => onClick(id)}>
      {name}
    </button>
  ),
}));

const makeArtist = (id: string, name: string): FollowedArtist => ({
  id,
  name,
  image: null,
  spotifyUrl: null,
});

describe("ArtistList", () => {
  it("renders one card per artist", () => {
    const artists = [makeArtist("a1", "Daft Punk"), makeArtist("a2", "Radiohead")];
    render(<ArtistList artists={artists} onClick={vi.fn()} />);

    expect(screen.getByText("Daft Punk")).toBeTruthy();
    expect(screen.getByText("Radiohead")).toBeTruthy();
  });

  it("renders nothing when artists list is empty", () => {
    const { container } = render(<ArtistList artists={[]} onClick={vi.fn()} />);

    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("calls onClick with the correct artist id when a card is clicked", () => {
    const onClick = vi.fn();
    const artists = [makeArtist("a1", "Daft Punk")];
    render(<ArtistList artists={artists} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Daft Punk" }));

    expect(onClick).toHaveBeenCalledWith("a1");
  });

  it("renders two cards for two artists", () => {
    const artists = [makeArtist("a1", "Daft Punk"), makeArtist("a2", "Radiohead")];
    render(<ArtistList artists={artists} onClick={vi.fn()} />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });
});
