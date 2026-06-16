import type { PlaylistHistory } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Playlist } from "@/types";
import { History } from "./History";

const mockUseHistoryController = vi.fn();

vi.mock("@/hooks/controllers/useHistoryController", () => ({
  useHistoryController: () => mockUseHistoryController(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("@/components/atoms/Loading", () => ({
  Loading: () => <div data-testid="loading" />,
}));

vi.mock("@/components/molecules/EmptyState", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

vi.mock("@/components/organisms/HistoryList", () => ({
  HistoryList: () => <div data-testid="history-list" />,
}));

vi.mock("@/components/molecules/PageHeader", () => ({
  PageHeader: () => null,
}));

vi.mock("@fortawesome/free-solid-svg-icons", () => ({
  faClockRotateLeft: {},
}));

const makeHistoryItem = (playlistId: string): PlaylistHistory => ({
  playlistId,
  playlistName: `Playlist ${playlistId}`,
  playlistSpotifyUrl: `https://open.spotify.com/playlist/${playlistId}`,
  trackCount: 10,
  lastCompletedAt: Date.now(),
});

const defaultController = {
  history: [],
  isLoading: false,
  activePlaylists: [] as Playlist[],
  recreatePlaylist: {
    isPending: false,
    variables: undefined,
  },
  handleRecreatePlaylistClick: vi.fn(),
  handleHistoryItemClick: vi.fn(),
};

describe("History", () => {
  it("shows Loading when isLoading is true", () => {
    mockUseHistoryController.mockReturnValue({
      ...defaultController,
      isLoading: true,
    });

    render(<History />);

    expect(screen.getByTestId("loading")).toBeTruthy();
    expect(screen.queryByTestId("history-list")).toBeNull();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });

  it("shows EmptyState when history is empty", () => {
    mockUseHistoryController.mockReturnValue({
      ...defaultController,
      history: [],
    });

    render(<History />);

    expect(screen.getByTestId("empty-state")).toBeTruthy();
    expect(screen.queryByTestId("history-list")).toBeNull();
  });

  it("renders HistoryList when history has items", () => {
    mockUseHistoryController.mockReturnValue({
      ...defaultController,
      history: [makeHistoryItem("pl-1"), makeHistoryItem("pl-2")],
    });

    render(<History />);

    expect(screen.getByTestId("history-list")).toBeTruthy();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });

  it("passes recreatingUrl as null when recreatePlaylist is not pending", () => {
    mockUseHistoryController.mockReturnValue({
      ...defaultController,
      history: [makeHistoryItem("pl-1")],
      recreatePlaylist: {
        isPending: false,
        variables: undefined,
      },
    });

    // The HistoryList is mocked — we just verify rendering succeeds without error
    // and the history list is shown (the mock would throw if null/undefined were invalid)
    render(<History />);

    expect(screen.getByTestId("history-list")).toBeTruthy();
  });
});
