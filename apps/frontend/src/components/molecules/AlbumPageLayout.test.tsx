import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AlbumPageLayout } from "./AlbumPageLayout";

vi.mock("./PlaylistHeader", () => ({
  PlaylistHeader: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("../organisms/PlaylistTracksList", () => ({
  PlaylistTracksList: ({ tracks }: { tracks: Array<{ id: string }> }) => (
    <div data-testid="tracks-list">{tracks.map((track) => track.id).join(",")}</div>
  ),
}));

describe("AlbumPageLayout", () => {
  it("renders empty state when tracks are missing", () => {
    render(
      <AlbumPageLayout
        title="Test Album"
        type={PlaylistTypeEnum.Album}
        totalCount={0}
        tracks={[]}
        emptyTitle="playlist.emptyTracksTitle"
        emptyDescription="playlist.emptyTracksDescription"
      />,
    );

    expect(screen.getByText("Test Album")).toBeDefined();
    expect(screen.getByText("playlist.emptyTracksTitle")).toBeDefined();
    expect(screen.getByText("playlist.emptyTracksDescription")).toBeDefined();
  });

  it("renders actions and tracks when tracks exist", () => {
    render(
      <AlbumPageLayout
        title="Test Album"
        type={PlaylistTypeEnum.Album}
        totalCount={1}
        tracks={[
          {
            id: "track-1",
            name: "Track 1",
            artist: "Artist 1",
            status: TrackStatusEnum.New,
          },
        ]}
        actions={<button type="button">action</button>}
        emptyTitle="playlist.emptyTracksTitle"
        emptyDescription="playlist.emptyTracksDescription"
      />,
    );

    expect(screen.getByRole("button", { name: "action" })).toBeDefined();
    expect(screen.getByTestId("tracks-list").textContent).toContain("track-1");
  });
});
