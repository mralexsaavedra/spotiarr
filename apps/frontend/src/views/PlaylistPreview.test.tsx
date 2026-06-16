import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistPreview } from "./PlaylistPreview";

const mockUsePlaylistPreviewController = vi.fn();

vi.mock("@/hooks/controllers/usePlaylistPreviewController", () => ({
  usePlaylistPreviewController: () => mockUsePlaylistPreviewController(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/skeletons/PlaylistSkeleton", () => ({
  PlaylistSkeleton: () => <div data-testid="playlist-skeleton" />,
}));

vi.mock("@/components/molecules/PreviewError", () => ({
  PreviewError: ({ error }: { error: unknown }) => (
    <div data-testid="preview-error">{String(error)}</div>
  ),
}));

vi.mock("@/components/molecules/PlaylistNotFound", () => ({
  PlaylistNotFound: () => <div data-testid="playlist-not-found" />,
}));

vi.mock("@/components/organisms/Playlist", () => ({
  Playlist: () => <div data-testid="playlist-view" />,
}));

const noop = vi.fn();

const baseController = {
  playlist: undefined,
  tracks: [],
  totalCount: 0,
  isLoading: false,
  error: null,
  isButtonLoading: false,
  hasMoreTracks: false,
  isLoadingMoreTracks: false,
  isDownloaded: false,
  isSaved: false,
  hasFailed: false,
  completedCount: 0,
  displayTitle: "",
  handleDownload: noop,
  handleToggleSubscription: noop,
  handleDelete: noop,
  handleRetryFailed: noop,
  handleRetryTrack: noop,
  handleLoadMoreTracks: noop,
  handleGoBack: noop,
  handleGoHome: noop,
};

describe("PlaylistPreview", () => {
  it("renders the skeleton while loading", () => {
    mockUsePlaylistPreviewController.mockReturnValue({
      ...baseController,
      isLoading: true,
    });

    render(<PlaylistPreview />);

    expect(screen.getByTestId("playlist-skeleton")).toBeTruthy();
    expect(screen.queryByTestId("playlist-view")).toBeNull();
    expect(screen.queryByTestId("preview-error")).toBeNull();
  });

  it("renders the error state when an error is present", () => {
    const error = new Error("Network failure");
    mockUsePlaylistPreviewController.mockReturnValue({
      ...baseController,
      error,
    });

    render(<PlaylistPreview />);

    expect(screen.getByTestId("preview-error")).toBeTruthy();
    expect(screen.queryByTestId("playlist-skeleton")).toBeNull();
    expect(screen.queryByTestId("playlist-view")).toBeNull();
  });

  it("renders the not-found state when loading is done, no error, and playlist is undefined", () => {
    mockUsePlaylistPreviewController.mockReturnValue({
      ...baseController,
      playlist: undefined,
    });

    render(<PlaylistPreview />);

    expect(screen.getByTestId("playlist-not-found")).toBeTruthy();
    expect(screen.queryByTestId("playlist-view")).toBeNull();
    expect(screen.queryByTestId("preview-error")).toBeNull();
  });

  it("renders the playlist view when playlist data is available", () => {
    mockUsePlaylistPreviewController.mockReturnValue({
      ...baseController,
      playlist: {
        id: "preview",
        name: "My Playlist",
        owner: "user",
        coverUrl: undefined,
        spotifyUrl: "https://open.spotify.com/playlist/123",
        subscribed: false,
        createdAt: 0,
        type: "playlist",
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
      },
      tracks: [],
      totalCount: 1,
    });

    render(<PlaylistPreview />);

    expect(screen.getByTestId("playlist-view")).toBeTruthy();
    expect(screen.queryByTestId("playlist-skeleton")).toBeNull();
    expect(screen.queryByTestId("preview-error")).toBeNull();
    expect(screen.queryByTestId("playlist-not-found")).toBeNull();
  });
});
