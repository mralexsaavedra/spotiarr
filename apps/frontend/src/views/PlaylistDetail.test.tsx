import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistDetail } from "./PlaylistDetail";

const mockUsePlaylistDetailController = vi.fn();

vi.mock("@/hooks/controllers/usePlaylistDetailController", () => ({
  usePlaylistDetailController: () => mockUsePlaylistDetailController(),
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock("@/components/organisms/Playlist", () => ({
  Playlist: () => <div data-testid="playlist-view" />,
}));

describe("PlaylistDetail", () => {
  it("renders local playback audio element and assertive playback errors for saved playlists", () => {
    mockUsePlaylistDetailController.mockReturnValue({
      playlist: { id: "playlist-1", name: "Road Trip" },
      tracks: [],
      isPlaylistsLoading: false,
      isTracksLoading: false,
      isDownloading: false,
      isDownloaded: true,
      hasFailed: false,
      completedCount: 0,
      displayTitle: "Road Trip",
      retryFailedTracks: { isPending: false },
      handleToggleSubscription: vi.fn(),
      handleDelete: vi.fn(),
      handleRetryFailed: vi.fn(),
      handleRetryTrack: vi.fn(),
      handleGoHome: vi.fn(),
      audioSrc: "/api/library/audio?path=%2Fmusic%2Ftrack.mp3",
      playbackError: "library.album.playbackUnavailable",
      setAudioElement: vi.fn(),
      onPlayTrack: vi.fn(),
      onPauseTrack: vi.fn(),
      onPlayPlaylist: vi.fn(),
      onPausePlaylist: vi.fn(),
      onAudioError: vi.fn(),
      onAudioPlay: vi.fn(),
      onAudioPause: vi.fn(),
      currentTrackId: "track-1",
      isPlaying: true,
      hasPlayableTracks: true,
    });

    const { container } = render(<PlaylistDetail />);

    expect(screen.getByTestId("playlist-view")).toBeTruthy();
    expect(container.querySelector("audio")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe("library.album.playbackUnavailable");
  });

  it("renders a passive no-playable-tracks message when tracks exist but none are playable yet", () => {
    mockUsePlaylistDetailController.mockReturnValue({
      playlist: { id: "playlist-1", name: "Road Trip" },
      tracks: [{ id: "track-1", title: "First Track" }],
      isPlaylistsLoading: false,
      isTracksLoading: false,
      isDownloading: false,
      isDownloaded: false,
      hasFailed: false,
      completedCount: 0,
      displayTitle: "Road Trip",
      retryFailedTracks: { isPending: false },
      handleToggleSubscription: vi.fn(),
      handleDelete: vi.fn(),
      handleRetryFailed: vi.fn(),
      handleRetryTrack: vi.fn(),
      handleGoHome: vi.fn(),
      playbackError: null,
      setAudioElement: vi.fn(),
      onPlayTrack: vi.fn(),
      onPauseTrack: vi.fn(),
      onPlayPlaylist: vi.fn(),
      onPausePlaylist: vi.fn(),
      onAudioError: vi.fn(),
      onAudioPlay: vi.fn(),
      onAudioPause: vi.fn(),
      currentTrackId: null,
      isPlaying: false,
      hasPlayableTracks: false,
    });

    render(<PlaylistDetail />);

    expect(screen.getByRole("status").textContent).toBe("playlist.noPlayableTracks");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
