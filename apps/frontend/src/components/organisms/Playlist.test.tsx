import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AlbumPageLayoutProps } from "../molecules/AlbumPageLayout";
import { Playlist } from "./Playlist";

const albumPageLayoutSpy = vi.fn<(props: AlbumPageLayoutProps) => void>();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, params?: { name?: string }) => {
      if (key === "playlist.deleteModal.title") {
        return `Delete ${params?.name}`;
      }

      return key;
    },
  }),
}));

vi.mock("../molecules/AlbumPageLayout", () => ({
  AlbumPageLayout: (props: AlbumPageLayoutProps) => {
    albumPageLayoutSpy(props);

    return (
      <div>
        <button type="button" onClick={() => props.onDownloadTrack?.(props.tracks[0])}>
          trigger-track-download
        </button>
        <button type="button" onClick={() => props.onRetryTrack?.(props.tracks[0]?.id ?? "")}>
          trigger-track-retry
        </button>
        <div data-testid="layout-tracks-count">{props.tracks.length}</div>
        {props.actions}
      </div>
    );
  },
}));

vi.mock("../molecules/PlaylistActions", () => ({
  PlaylistActions: ({
    onDownload,
    onDelete,
    onRetryFailed,
    onToggleSubscription,
  }: {
    onDownload: () => void;
    onDelete: () => void;
    onRetryFailed?: () => void;
    onToggleSubscription?: () => void;
  }) => (
    <div>
      <button type="button" onClick={onDownload}>
        action-download-or-retry
      </button>
      <button type="button" onClick={onDelete}>
        action-delete
      </button>
      <button type="button" onClick={onRetryFailed}>
        action-retry-failed
      </button>
      <button type="button" onClick={onToggleSubscription}>
        action-toggle-subscription
      </button>
    </div>
  ),
}));

vi.mock("../organisms/ConfirmModal", () => ({
  ConfirmModal: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) =>
    isOpen ? (
      <div role="dialog" aria-label="confirm-delete">
        <button type="button" onClick={onConfirm}>
          confirm-delete
        </button>
      </div>
    ) : null,
}));

describe("Playlist", () => {
  it("wires catalog actions, delete flow, and track callbacks through AlbumPageLayout", () => {
    const onDownloadOrRetry = vi.fn();
    const onDownloadTrack = vi.fn();
    const onRetryTrack = vi.fn();
    const onConfirmDelete = vi.fn();
    const onRetryFailed = vi.fn();
    const onToggleSubscription = vi.fn();

    const tracks = [
      {
        id: "track-1",
        name: "Track 1",
        artist: "Artist 1",
        status: TrackStatusEnum.New,
      },
    ];

    render(
      <Playlist
        playlist={{
          id: "playlist-1",
          name: "Playlist 1",
          type: PlaylistTypeEnum.Album,
          owner: "Owner",
          stats: {
            completedCount: 0,
            downloadingCount: 0,
            searchingCount: 0,
            queuedCount: 0,
            activeCount: 0,
            errorCount: 0,
            totalCount: 1,
            progress: 0,
            isDownloading: false,
            hasErrors: false,
            isCompleted: false,
          },
        }}
        tracks={tracks}
        hasFailed={true}
        isRetrying={false}
        isDownloading={false}
        isDownloaded={false}
        isSaved={true}
        displayTitle="Playlist Title"
        completedCount={0}
        onDownloadOrRetry={onDownloadOrRetry}
        onDownloadTrack={onDownloadTrack}
        onRetryTrack={onRetryTrack}
        onPlayTrack={vi.fn()}
        onPauseTrack={vi.fn()}
        onPlayPlaylist={vi.fn()}
        onPausePlaylist={vi.fn()}
        currentTrackId="track-1"
        isPlaying={true}
        hasPlayableTracks={true}
        onConfirmDelete={onConfirmDelete}
        onRetryFailed={onRetryFailed}
        onToggleSubscription={onToggleSubscription}
      />,
    );

    expect(screen.getByTestId("layout-tracks-count").textContent).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "action-download-or-retry" }));
    expect(onDownloadOrRetry).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "action-retry-failed" }));
    expect(onRetryFailed).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "action-toggle-subscription" }));
    expect(onToggleSubscription).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "trigger-track-download" }));
    expect(onDownloadTrack).toHaveBeenCalledWith(tracks[0]);

    fireEvent.click(screen.getByRole("button", { name: "trigger-track-retry" }));
    expect(onRetryTrack).toHaveBeenCalledWith("track-1");

    expect(screen.queryByRole("dialog", { name: "confirm-delete" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "action-delete" }));
    expect(screen.getByRole("dialog", { name: "confirm-delete" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "confirm-delete" }));
    expect(onConfirmDelete).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog", { name: "confirm-delete" })).toBeNull();

    expect(albumPageLayoutSpy).toHaveBeenCalled();
    expect(albumPageLayoutSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        onPlayTrack: expect.any(Function),
        onPauseTrack: expect.any(Function),
        currentTrackId: "track-1",
        isPlaying: true,
      }),
    );
  });
});
