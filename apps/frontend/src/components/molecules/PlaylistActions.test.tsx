import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistActions } from "./PlaylistActions";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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
