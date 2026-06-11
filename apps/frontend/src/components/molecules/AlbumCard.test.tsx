import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlbumCard } from "./AlbumCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOptions?: string | Record<string, unknown>) => {
      if (key === "common.cards.albumCardAriaLabel") {
        const opts = fallbackOrOptions as { name: string; artist: string };
        return `${opts.name} by ${opts.artist}`;
      }
      if (key === "common.cards.viewArtist") {
        const opts = fallbackOrOptions as { name: string };
        return `View artist ${opts.name}`;
      }
      if (key === "common.cards.tooltips.download") return "Download";
      if (key === "common.cards.tooltips.alreadyDownloaded") return "Already downloaded";
      if (key === "common.cards.tooltips.downloading") return "Downloading...";
      return typeof fallbackOrOptions === "string" ? fallbackOrOptions : key;
    },
  }),
}));

vi.mock("@/utils/date", () => ({
  formatRelativeDate: () => "2 years ago",
}));

const baseProps = {
  albumId: "album-1",
  artistId: "artist-1",
  albumName: "Discovery",
  artistName: "Daft Punk",
  onCardClick: vi.fn(),
  onArtistClick: vi.fn(),
};

describe("AlbumCard", () => {
  it("renders album name and artist name", () => {
    render(<AlbumCard {...baseProps} />);

    expect(screen.getByText("Discovery")).not.toBeNull();
    expect(screen.getByText("Daft Punk")).not.toBeNull();
  });

  it("exposes the card as an accessible button with album aria-label", () => {
    render(<AlbumCard {...baseProps} />);

    const button = screen.getByRole("button", { name: "Discovery by Daft Punk" });
    expect(button).not.toBeNull();
  });

  it("calls onCardClick when the overlay button is clicked", () => {
    const onCardClick = vi.fn();
    render(<AlbumCard {...baseProps} onCardClick={onCardClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Discovery by Daft Punk" }));
    expect(onCardClick).toHaveBeenCalledTimes(1);
  });

  it("calls onArtistClick with artistId when artist button is clicked", () => {
    const onArtistClick = vi.fn();
    const onCardClick = vi.fn();
    render(<AlbumCard {...baseProps} onArtistClick={onArtistClick} onCardClick={onCardClick} />);

    fireEvent.click(screen.getByRole("button", { name: "View artist Daft Punk" }));
    expect(onArtistClick).toHaveBeenCalledWith("artist-1");
  });

  it("does not call onCardClick when artist button is clicked (stopPropagation)", () => {
    const onArtistClick = vi.fn();
    const onCardClick = vi.fn();
    render(<AlbumCard {...baseProps} onArtistClick={onArtistClick} onCardClick={onCardClick} />);

    fireEvent.click(screen.getByRole("button", { name: "View artist Daft Punk" }));
    expect(onCardClick).not.toHaveBeenCalled();
  });

  it("calls onDownloadClick when download button is clicked and does not call onCardClick", () => {
    const onDownloadClick = vi.fn();
    const onCardClick = vi.fn();
    render(
      <AlbumCard
        {...baseProps}
        onCardClick={onCardClick}
        onDownloadClick={onDownloadClick}
        spotifyUrl="https://open.spotify.com/album/123"
      />,
    );

    const downloadBtn = screen.getByTitle("Download");
    fireEvent.click(downloadBtn);
    expect(onDownloadClick).toHaveBeenCalledTimes(1);
    expect(onCardClick).not.toHaveBeenCalled();
  });
});
