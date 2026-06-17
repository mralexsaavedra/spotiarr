import { TrackStatusEnum } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Track } from "@/types";
import { PlaylistTracksList } from "./PlaylistTracksList";

vi.mock("@/hooks/queries/useDownloadStatus", () => ({
  useBulkTrackStatus: () => new Map<string, TrackStatusEnum>(),
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

vi.mock("../molecules/VirtualList", () => ({
  VirtualList: ({
    items,
    renderItem,
  }: {
    items: Track[];
    renderItem: (track: Track, index: number) => React.ReactNode;
  }) => (
    <div>
      {items.map((item, index) => (
        <div key={item.id}>{renderItem(item, index)}</div>
      ))}
    </div>
  ),
}));

const tracks: Track[] = [
  {
    id: "track-1",
    name: "Track 1",
    artist: "Artist 1",
    album: "Album 1",
    durationMs: 120000,
    status: TrackStatusEnum.Completed,
    audioUrl: "/api/library/audio?path=%2Ftmp%2F01.mp3",
    trackUrl: "/api/library/audio?path=%2Ftmp%2F01.mp3",
  },
];

describe("PlaylistTracksList playback", () => {
  it("renders a pause button for currently playing track", () => {
    render(
      <PlaylistTracksList
        tracks={tracks}
        currentTrackId="track-1"
        isPlaying={true}
        onPlayTrack={vi.fn()}
        onPauseTrack={vi.fn()}
        canPlayTrack={(track) => Boolean(track.audioUrl)}
      />,
    );

    expect(screen.getByRole("button", { name: "library.album.pauseTrack" })).toBeTruthy();
  });

  it("calls onPlayTrack when number cell play button is pressed", () => {
    const onPlayTrack = vi.fn();

    render(
      <PlaylistTracksList
        tracks={tracks}
        currentTrackId={null}
        isPlaying={false}
        onPlayTrack={onPlayTrack}
        canPlayTrack={(track) => Boolean(track.audioUrl)}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "library.album.playTrack" }));
    expect(onPlayTrack).toHaveBeenCalledWith("track-1");
  });

  it("hides playback controls for tracks without a playable audioUrl", () => {
    render(
      <PlaylistTracksList
        tracks={[
          {
            ...tracks[0],
            id: "track-2",
            audioUrl: undefined,
          },
        ]}
        currentTrackId={null}
        isPlaying={false}
        onPlayTrack={vi.fn()}
        canPlayTrack={(track) => Boolean(track.audioUrl)}
      />,
    );

    expect(screen.queryByRole("button", { name: "library.album.playTrack" })).toBeNull();
  });

  it("does not render faCircleCheck downloaded badge in any row", () => {
    render(
      <PlaylistTracksList
        tracks={tracks}
        currentTrackId={null}
        isPlaying={false}
        onPlayTrack={vi.fn()}
        canPlayTrack={(track) => Boolean(track.audioUrl)}
      />,
    );

    expect(document.querySelector("[data-icon='circle-check']")).toBeNull();
  });

  it("does not render Reproducir text button", () => {
    render(
      <PlaylistTracksList
        tracks={tracks}
        currentTrackId={null}
        isPlaying={false}
        onPlayTrack={vi.fn()}
        canPlayTrack={(track) => Boolean(track.audioUrl)}
      />,
    );

    expect(screen.queryByText("library.album.play")).toBeNull();
    expect(screen.queryByText("library.album.pause")).toBeNull();
  });

  it("shows pause button in number cell for current playing track", () => {
    render(
      <PlaylistTracksList
        tracks={tracks}
        currentTrackId="track-1"
        isPlaying={true}
        onPlayTrack={vi.fn()}
        onPauseTrack={vi.fn()}
        canPlayTrack={(track) => Boolean(track.audioUrl)}
      />,
    );

    expect(screen.getByRole("button", { name: "library.album.pauseTrack" })).toBeTruthy();
    expect(screen.queryByText("library.album.pause")).toBeNull();
  });

  it("shows play button in number cell for current paused track", () => {
    render(
      <PlaylistTracksList
        tracks={tracks}
        currentTrackId="track-1"
        isPlaying={false}
        onPlayTrack={vi.fn()}
        onPauseTrack={vi.fn()}
        canPlayTrack={(track) => Boolean(track.audioUrl)}
      />,
    );

    expect(screen.getByRole("button", { name: "library.album.playTrack" })).toBeTruthy();
  });

  it("highlights the current track title in green", () => {
    render(
      <PlaylistTracksList
        tracks={tracks}
        currentTrackId="track-1"
        isPlaying={true}
        onPlayTrack={vi.fn()}
        onPauseTrack={vi.fn()}
        canPlayTrack={(track) => Boolean(track.audioUrl)}
      />,
    );

    expect(screen.getByText("Track 1").closest("div")?.className).toContain("text-green-400");
  });

  it("does not highlight a non-current track title", () => {
    render(
      <PlaylistTracksList
        tracks={tracks}
        currentTrackId={null}
        isPlaying={false}
        onPlayTrack={vi.fn()}
        canPlayTrack={(track) => Boolean(track.audioUrl)}
      />,
    );

    const title = screen.getByText("Track 1").closest("div");
    expect(title?.className).toContain("text-text-primary");
    expect(title?.className).not.toContain("text-green-400");
  });
});
