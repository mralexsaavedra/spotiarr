import type { RecentPlayItem } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecentPlaysSection } from "./RecentPlaysSection";

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock("@/utils/date", () => ({
  formatRelativeDate: (timestamp: number) => new Date(timestamp).toISOString(),
}));

vi.mock("@/components/atoms/Loading", () => ({
  Loading: () => <div data-testid="loading-skeleton" />,
}));

vi.mock("@/components/molecules/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

const makeRecentPlay = (overrides: Partial<RecentPlayItem> = {}): RecentPlayItem => ({
  trackId: "t-1",
  trackUrl: "https://example.com/track.mp3",
  trackName: "Recent Track",
  artist: "Some Artist",
  album: null,
  playedAt: 1700000000000,
  ...overrides,
});

describe("RecentPlaysSection", () => {
  describe("loading state", () => {
    it("renders a loading skeleton while loading", () => {
      render(<RecentPlaysSection recentPlays={[]} isLoading={true} />);

      expect(screen.getByTestId("loading-skeleton")).toBeTruthy();
    });

    it("does not render play entries while loading", () => {
      render(<RecentPlaysSection recentPlays={[makeRecentPlay()]} isLoading={true} />);

      expect(screen.queryByText("Recent Track")).toBeNull();
    });
  });

  describe("empty state", () => {
    it("renders empty state message when list is empty and not loading", () => {
      render(<RecentPlaysSection recentPlays={[]} isLoading={false} />);

      expect(screen.getByTestId("empty-state")).toBeTruthy();
      expect(screen.getByText("dashboard.recentPlaysEmpty")).toBeTruthy();
    });

    it("does not render loading skeleton when not loading", () => {
      render(<RecentPlaysSection recentPlays={[]} isLoading={false} />);

      expect(screen.queryByTestId("loading-skeleton")).toBeNull();
    });
  });

  describe("populated state", () => {
    it("renders an entry with track name and artist", () => {
      render(
        <RecentPlaysSection
          recentPlays={[makeRecentPlay({ trackName: "Cool Song", artist: "Cool Band" })]}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Cool Song")).toBeTruthy();
      expect(screen.getByText("Cool Band")).toBeTruthy();
    });

    it("renders a human-readable timestamp for each entry", () => {
      const playedAt = new Date("2024-01-15T10:00:00Z").getTime();
      render(<RecentPlaysSection recentPlays={[makeRecentPlay({ playedAt })]} isLoading={false} />);

      // The timestamp should render as some non-empty text (formatted date/relative)
      expect(screen.getByTestId("recent-play-timestamp")).toBeTruthy();
    });

    it("renders the section heading with recentPlaysTitle i18n key", () => {
      render(<RecentPlaysSection recentPlays={[makeRecentPlay()]} isLoading={false} />);

      expect(screen.getByText("dashboard.recentPlaysTitle")).toBeTruthy();
    });

    it("does not render empty state when data is present", () => {
      render(<RecentPlaysSection recentPlays={[makeRecentPlay()]} isLoading={false} />);

      expect(screen.queryByTestId("empty-state")).toBeNull();
    });
  });
});
