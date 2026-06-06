import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistActions } from "./PlaylistActions";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const defaultProps = {
  isSubscribed: true,
  hasFailed: false,
  isRetrying: false,
  isDownloading: false,
  isDownloaded: true,
  isSaved: true,
  hasPlayableTracks: true,
  isPlaying: false,
  onPlayPlaylist: vi.fn(),
  onPausePlaylist: vi.fn(),
  onToggleSubscription: vi.fn(),
  onRetryFailed: vi.fn(),
  onDelete: vi.fn(),
  onDownload: vi.fn(),
};

describe("PlaylistActions playback", () => {
  it("renders a primary play control for saved playlists with playable tracks", () => {
    const onPlayPlaylist = vi.fn();

    render(
      <PlaylistActions
        isSubscribed={true}
        hasFailed={false}
        isRetrying={false}
        isDownloading={false}
        isDownloaded={true}
        isSaved={true}
        hasPlayableTracks={true}
        isPlaying={false}
        onPlayPlaylist={onPlayPlaylist}
        onPausePlaylist={vi.fn()}
        onToggleSubscription={vi.fn()}
        onRetryFailed={vi.fn()}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "library.album.playTrack" }));
    expect(onPlayPlaylist).toHaveBeenCalledTimes(1);
  });

  it("switches the primary control to pause while playback is active", () => {
    const onPausePlaylist = vi.fn();

    render(
      <PlaylistActions
        isSubscribed={true}
        hasFailed={false}
        isRetrying={false}
        isDownloading={false}
        isDownloaded={true}
        isSaved={true}
        hasPlayableTracks={true}
        isPlaying={true}
        onPlayPlaylist={vi.fn()}
        onPausePlaylist={onPausePlaylist}
        onToggleSubscription={vi.fn()}
        onRetryFailed={vi.fn()}
        onDelete={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "library.album.pauseTrack" }));
    expect(onPausePlaylist).toHaveBeenCalledTimes(1);
  });
});

describe("PlaylistActions shuffle button", () => {
  it("renders shuffle button when onShufflePlay and hasPlayableTracks are provided", () => {
    const onShufflePlay = vi.fn();
    render(<PlaylistActions {...defaultProps} onShufflePlay={onShufflePlay} />);
    expect(screen.getByRole("button", { name: "playlist.actions.shufflePlay" })).toBeTruthy();
  });

  it("does not render shuffle button when onShufflePlay is not provided", () => {
    render(<PlaylistActions {...defaultProps} />);
    expect(screen.queryByRole("button", { name: "playlist.actions.shufflePlay" })).toBeNull();
  });

  it("does not render shuffle button when hasPlayableTracks is false", () => {
    render(<PlaylistActions {...defaultProps} hasPlayableTracks={false} onShufflePlay={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "playlist.actions.shufflePlay" })).toBeNull();
  });

  it("applies text-green-500 class when isShuffleActive is true", () => {
    render(<PlaylistActions {...defaultProps} onShufflePlay={vi.fn()} isShuffleActive={true} />);
    const btn = screen.getByRole("button", { name: "playlist.actions.shufflePlay" });
    expect(btn.className).toContain("text-green-500");
  });

  it("calls onShufflePlay when shuffle button is clicked", () => {
    const onShufflePlay = vi.fn();
    render(<PlaylistActions {...defaultProps} onShufflePlay={onShufflePlay} />);
    fireEvent.click(screen.getByRole("button", { name: "playlist.actions.shufflePlay" }));
    expect(onShufflePlay).toHaveBeenCalledTimes(1);
  });

  it("shuffle button appears after play button in DOM order", () => {
    const onShufflePlay = vi.fn();
    render(<PlaylistActions {...defaultProps} onShufflePlay={onShufflePlay} />);
    const buttons = screen.getAllByRole("button");
    const playIndex = buttons.findIndex(
      (b) => b.getAttribute("aria-label") === "library.album.playTrack",
    );
    const shuffleIndex = buttons.findIndex(
      (b) => b.getAttribute("aria-label") === "playlist.actions.shufflePlay",
    );
    expect(playIndex).toBeGreaterThanOrEqual(0);
    expect(shuffleIndex).toBeGreaterThan(playIndex);
  });
});
