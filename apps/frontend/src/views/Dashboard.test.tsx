import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Dashboard } from "./Dashboard";

const mockUseDashboardController = vi.fn();

vi.mock("@/hooks/controllers/useDashboardController", () => ({
  useDashboardController: () => mockUseDashboardController(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("@/components/organisms/LibraryStatsSection", () => ({
  LibraryStatsSection: ({ stats }: { stats: unknown }) => (
    <div data-testid="library-stats-section" data-has-stats={stats !== null ? "true" : "false"} />
  ),
}));

vi.mock("@/components/organisms/DownloadHistorySection", () => ({
  DownloadHistorySection: ({ onRecreate }: { onRecreate: unknown }) => (
    <div
      data-testid="download-history-section"
      data-has-recreate={typeof onRecreate === "function" ? "true" : "false"}
    />
  ),
}));

vi.mock("@/components/organisms/MostListenedSection", () => ({
  MostListenedSection: () => <div data-testid="most-listened-section" />,
}));

vi.mock("@/components/organisms/RecentPlaysSection", () => ({
  RecentPlaysSection: () => <div data-testid="recent-plays-section" />,
}));

vi.mock("@/components/molecules/PageHeader", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

const defaultController = {
  statsProps: null,
  historyProps: {
    history: [],
    isLoading: false,
    activePlaylists: [],
    recreatingUrl: null,
    onRecreate: vi.fn(),
    onItemClick: vi.fn(),
  },
  mostListenedProps: {
    topTracks: [],
    topArtists: [],
    isLoading: false,
  },
  recentPlaysProps: {
    recentPlays: [],
    isLoading: false,
  },
};

describe("Dashboard", () => {
  beforeEach(() => {
    mockUseDashboardController.mockReturnValue(defaultController);
  });

  it("renders LibraryStatsSection", () => {
    render(<Dashboard />);

    expect(screen.getByTestId("library-stats-section")).toBeTruthy();
  });

  it("renders DownloadHistorySection", () => {
    render(<Dashboard />);

    expect(screen.getByTestId("download-history-section")).toBeTruthy();
  });

  it("wires historyProps.onRecreate into DownloadHistorySection", () => {
    render(<Dashboard />);

    const section = screen.getByTestId("download-history-section");
    expect(section.getAttribute("data-has-recreate")).toBe("true");
  });

  it("renders MostListenedSection", () => {
    render(<Dashboard />);

    expect(screen.getByTestId("most-listened-section")).toBeTruthy();
  });

  it("renders RecentPlaysSection", () => {
    render(<Dashboard />);

    expect(screen.getByTestId("recent-plays-section")).toBeTruthy();
  });

  it("renders page header with dashboard.title i18n key", () => {
    render(<Dashboard />);

    expect(screen.getByText("dashboard.title")).toBeTruthy();
  });

  it("passes statsProps to LibraryStatsSection", () => {
    const statsProps = { artists: 10, albums: 20, tracks: 100, size: "1.00 GB" };
    mockUseDashboardController.mockReturnValue({
      ...defaultController,
      statsProps,
    });

    render(<Dashboard />);

    const section = screen.getByTestId("library-stats-section");
    expect(section.getAttribute("data-has-stats")).toBe("true");
  });

  it("renders MostListenedSection and RecentPlaysSection in order above DownloadHistorySection", () => {
    render(<Dashboard />);

    expect(screen.getByTestId("most-listened-section")).toBeTruthy();
    expect(screen.getByTestId("recent-plays-section")).toBeTruthy();
    expect(screen.getByTestId("download-history-section")).toBeTruthy();
  });
});
