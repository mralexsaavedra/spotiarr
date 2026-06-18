import type { TopArtistItem, TopTrackItem } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MostListenedSection } from "./MostListenedSection";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/atoms/Loading", () => ({
  Loading: () => <div data-testid="loading-skeleton" />,
}));

vi.mock("@/components/molecules/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

const makeTopTrack = (overrides: Partial<TopTrackItem> = {}): TopTrackItem => ({
  trackUrl: "https://example.com/track.mp3",
  trackName: "Best Track",
  artist: "Best Artist",
  album: null,
  albumCoverUrl: null,
  playCount: 5,
  lastPlayedAt: 1700000000000,
  ...overrides,
});

const makeTopArtist = (overrides: Partial<TopArtistItem> = {}): TopArtistItem => ({
  artist: "Best Artist",
  playCount: 10,
  lastPlayedAt: 1700000000000,
  ...overrides,
});

describe("MostListenedSection", () => {
  describe("loading state", () => {
    it("renders a loading skeleton while loading", () => {
      render(<MostListenedSection topTracks={[]} topArtists={[]} isLoading={true} />);

      expect(screen.getByTestId("loading-skeleton")).toBeTruthy();
    });

    it("does not render track or artist lists while loading", () => {
      render(
        <MostListenedSection
          topTracks={[makeTopTrack()]}
          topArtists={[makeTopArtist()]}
          isLoading={true}
        />,
      );

      expect(screen.queryByText("Best Track")).toBeNull();
      expect(screen.queryByText("Best Artist")).toBeNull();
    });
  });

  describe("empty state", () => {
    it("renders empty state message when both lists are empty and not loading", () => {
      render(<MostListenedSection topTracks={[]} topArtists={[]} isLoading={false} />);

      expect(screen.getByTestId("empty-state")).toBeTruthy();
      expect(screen.getByText("dashboard.mostListenedEmpty")).toBeTruthy();
    });

    it("does not render loading skeleton when not loading", () => {
      render(<MostListenedSection topTracks={[]} topArtists={[]} isLoading={false} />);

      expect(screen.queryByTestId("loading-skeleton")).toBeNull();
    });
  });

  describe("populated state", () => {
    it("renders a top-track entry with name and artist", () => {
      render(
        <MostListenedSection
          topTracks={[makeTopTrack({ trackName: "Song A", artist: "Band X" })]}
          topArtists={[]}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Song A")).toBeTruthy();
      expect(screen.getByText("Band X")).toBeTruthy();
    });

    it("renders a top-artist entry with name and play count", () => {
      render(
        <MostListenedSection
          topTracks={[]}
          topArtists={[makeTopArtist({ artist: "Band Y", playCount: 7 })]}
          isLoading={false}
        />,
      );

      expect(screen.getByText("Band Y")).toBeTruthy();
      expect(screen.getByText("7")).toBeTruthy();
    });

    it("renders the topTracksTitle i18n key as sub-heading", () => {
      render(
        <MostListenedSection topTracks={[makeTopTrack()]} topArtists={[]} isLoading={false} />,
      );

      expect(screen.getByText("dashboard.topTracksTitle")).toBeTruthy();
    });

    it("renders the topArtistsTitle i18n key as sub-heading", () => {
      render(
        <MostListenedSection topTracks={[]} topArtists={[makeTopArtist()]} isLoading={false} />,
      );

      expect(screen.getByText("dashboard.topArtistsTitle")).toBeTruthy();
    });

    it("renders the section heading mostListenedTitle", () => {
      render(<MostListenedSection topTracks={[]} topArtists={[]} isLoading={false} />);

      expect(screen.getByText("dashboard.mostListenedTitle")).toBeTruthy();
    });

    it("does not render empty state when data is present", () => {
      render(
        <MostListenedSection
          topTracks={[makeTopTrack()]}
          topArtists={[makeTopArtist()]}
          isLoading={false}
        />,
      );

      expect(screen.queryByTestId("empty-state")).toBeNull();
    });
  });
});
