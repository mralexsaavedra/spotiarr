import { FollowedArtist } from "@spotiarr/shared";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SearchArtistGrid } from "./SearchArtistGrid";

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

const makeArtist = (id: string, name = `Artist ${id}`): FollowedArtist => ({
  id,
  name,
  image: null,
  spotifyUrl: `https://open.spotify.com/artist/${id}`,
});

describe("SearchArtistGrid", () => {
  it("renders one card per artist", () => {
    render(
      <SearchArtistGrid
        artists={[makeArtist("ar1", "Radiohead"), makeArtist("ar2", "Portishead")]}
        onClick={vi.fn()}
      />,
    );
    expect(screen.getByText("Radiohead")).toBeTruthy();
    expect(screen.getByText("Portishead")).toBeTruthy();
  });

  it("renders nothing when the artists list is empty", () => {
    const { container } = render(<SearchArtistGrid artists={[]} onClick={vi.fn()} />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });

  it("calls onClick with the artist id when a card is clicked", () => {
    const onClick = vi.fn();
    render(<SearchArtistGrid artists={[makeArtist("ar3", "Massive Attack")]} onClick={onClick} />);

    // ArtistCard renders a <button aria-label={name}>
    const btn = screen.getByRole("button", { name: "Massive Attack" });
    fireEvent.click(btn);

    expect(onClick).toHaveBeenCalledWith("ar3");
  });

  it("calls onClick with the correct id for each artist in a multi-item list", () => {
    const onClick = vi.fn();
    render(
      <SearchArtistGrid
        artists={[makeArtist("x1", "Aphex Twin"), makeArtist("x2", "Autechre")]}
        onClick={onClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Autechre" }));

    expect(onClick).toHaveBeenCalledWith("x2");
  });
});
