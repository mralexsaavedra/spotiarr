import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SpotifyPlaylistCard } from "./SpotifyPlaylistCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { count?: number }) => {
      if (key === "common.by") return "by";
      if (key === "common.cards.status.tracks") return opts?.count === 1 ? "track" : "tracks";
      return key;
    },
  }),
}));

vi.mock("../atoms/Image", () => ({
  Image: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const baseProps = {
  id: "playlist-1",
  name: "My Playlist",
  image: null,
  owner: "John Doe",
  tracks: 10,
  onClick: vi.fn(),
};

describe("SpotifyPlaylistCard", () => {
  it("renders the playlist name", () => {
    render(<SpotifyPlaylistCard {...baseProps} />);

    expect(screen.getByText("My Playlist")).not.toBeNull();
  });

  it("renders owner name as plain text when ownerUrl is not provided", () => {
    render(<SpotifyPlaylistCard {...baseProps} />);

    // "John Doe" is a text node inside a <p> that also contains "by" and "• N tracks",
    // so use getAllByText with exact:false to match the text node content.
    expect(screen.getAllByText(/John Doe/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("renders owner as a link when ownerUrl is provided", () => {
    render(<SpotifyPlaylistCard {...baseProps} ownerUrl="https://open.spotify.com/user/johndoe" />);

    const link = screen.getByRole("link", { name: "John Doe" }) as HTMLAnchorElement;
    expect(link.href).toBe("https://open.spotify.com/user/johndoe");
  });

  it("renders track count", () => {
    render(<SpotifyPlaylistCard {...baseProps} tracks={5} />);

    expect(screen.getByText(/5/)).not.toBeNull();
  });

  it("calls onClick with the playlist id when the card is clicked", () => {
    const onClick = vi.fn();
    render(<SpotifyPlaylistCard {...baseProps} onClick={onClick} />);

    fireEvent.click(screen.getByRole("article"));

    expect(onClick).toHaveBeenCalledWith("playlist-1");
  });

  it("does not propagate click when the owner link is clicked", () => {
    const onClick = vi.fn();
    render(
      <SpotifyPlaylistCard
        {...baseProps}
        onClick={onClick}
        ownerUrl="https://open.spotify.com/user/johndoe"
      />,
    );

    fireEvent.click(screen.getByRole("link", { name: "John Doe" }));

    expect(onClick).not.toHaveBeenCalled();
  });
});
