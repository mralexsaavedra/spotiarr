import { TrackStatusEnum } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PlaylistWithStats, Track } from "@/types";
import { AlbumDetail } from "./AlbumDetail";

const mockUseAlbumDetailController = vi.fn();

vi.mock("@/hooks/controllers/useAlbumDetailController", () => ({
  useAlbumDetailController: () => mockUseAlbumDetailController(),
}));

vi.mock("@/components/skeletons/PlaylistSkeleton", () => ({
  PlaylistSkeleton: () => <div data-testid="playlist-skeleton" />,
}));

vi.mock("@/components/molecules/PreviewError", () => ({
  PreviewError: () => <div data-testid="preview-error" />,
}));

vi.mock("@/components/molecules/PlaylistNotFound", () => ({
  PlaylistNotFound: () => <div data-testid="playlist-not-found" />,
}));

vi.mock("@/components/organisms/Playlist", () => ({
  Playlist: () => <div data-testid="playlist" />,
}));

const makeTrack = (id: string): Track => ({
  id,
  name: "Track",
  artist: "Artist",
  status: TrackStatusEnum.Completed,
  playlistId: "playlist-1",
});

const makePlaylist = (): PlaylistWithStats => ({
  id: "playlist-1",
  name: "Test Playlist",
  owner: "owner",
  coverUrl: undefined,
  tracks: [makeTrack("t1")],
  stats: {
    completedCount: 1,
    downloadingCount: 0,
    searchingCount: 0,
    queuedCount: 0,
    activeCount: 0,
    errorCount: 0,
    totalCount: 1,
    progress: 100,
    isDownloading: false,
    hasErrors: false,
    isCompleted: true,
  },
});

const defaultController = {
  playlist: makePlaylist(),
  tracks: [makeTrack("t1")],
  album: undefined,
  isLoading: false,
  error: null,
  isButtonLoading: false,
  hasMoreTracks: false as const,
  isLoadingMoreTracks: false as const,
  isDownloaded: true,
  isSaved: false,
  hasFailed: false,
  completedCount: 1,
  displayTitle: "Test Playlist",
  handleDownload: vi.fn(),
  handleDownloadTrack: vi.fn(),
  handleToggleSubscription: vi.fn(),
  handleDelete: vi.fn(),
  handleRetryFailed: vi.fn(),
  handleRetryTrack: vi.fn(),
  onLoadMoreTracks: undefined,
  handleGoBack: vi.fn(),
  handleGoHome: vi.fn(),
};

describe("AlbumDetail", () => {
  it("shows PlaylistSkeleton when isLoading is true", () => {
    mockUseAlbumDetailController.mockReturnValue({
      ...defaultController,
      isLoading: true,
    });

    render(<AlbumDetail />);

    expect(screen.getByTestId("playlist-skeleton")).toBeTruthy();
    expect(screen.queryByTestId("playlist")).toBeNull();
  });

  it("shows PreviewError when error is set", () => {
    mockUseAlbumDetailController.mockReturnValue({
      ...defaultController,
      error: new Error("Something went wrong"),
    });

    render(<AlbumDetail />);

    expect(screen.getByTestId("preview-error")).toBeTruthy();
    expect(screen.queryByTestId("playlist")).toBeNull();
  });

  it("shows PlaylistNotFound when playlist is undefined", () => {
    mockUseAlbumDetailController.mockReturnValue({
      ...defaultController,
      playlist: undefined,
    });

    render(<AlbumDetail />);

    expect(screen.getByTestId("playlist-not-found")).toBeTruthy();
    expect(screen.queryByTestId("playlist")).toBeNull();
  });

  it("shows Playlist component when data is ready", () => {
    mockUseAlbumDetailController.mockReturnValue(defaultController);

    render(<AlbumDetail />);

    expect(screen.getByTestId("playlist")).toBeTruthy();
    expect(screen.queryByTestId("playlist-skeleton")).toBeNull();
    expect(screen.queryByTestId("preview-error")).toBeNull();
    expect(screen.queryByTestId("playlist-not-found")).toBeNull();
  });
});
