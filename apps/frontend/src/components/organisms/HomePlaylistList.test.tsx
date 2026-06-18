import { TrackStatusEnum } from "@spotiarr/shared";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistWithStats } from "@/types";
import { HomePlaylistList } from "./HomePlaylistList";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("../molecules/VirtualGrid", () => ({
  VirtualGrid: <T,>({
    items,
    itemKey,
    renderItem,
  }: {
    items: T[];
    itemKey: (item: T) => string;
    renderItem: (item: T) => ReactNode;
  }) => (
    <div>
      {items.map((item) => (
        <div key={itemKey(item)}>{renderItem(item)}</div>
      ))}
    </div>
  ),
}));

const makeItem = (
  id: string,
  name: string,
): { playlist: PlaylistWithStats; downloadedCount: number; totalCount: number } => ({
  playlist: {
    id,
    name,
    owner: "test-owner",
    coverUrl: undefined,
    tracks: [
      {
        id: `${id}-t1`,
        name: "Track 1",
        artist: "Artist",
        status: TrackStatusEnum.Completed,
        playlistId: id,
      },
    ],
    stats: {
      completedCount: 1,
      downloadingCount: 0,
      searchingCount: 0,
      queuedCount: 0,
      activeCount: 0,
      errorCount: 0,
      totalCount: 10,
      progress: 10,
      isDownloading: false,
      hasErrors: false,
      isCompleted: false,
    },
  },
  downloadedCount: 1,
  totalCount: 10,
});

describe("HomePlaylistList", () => {
  it("renders one card per item in the list", () => {
    const items = [makeItem("p1", "Playlist One"), makeItem("p2", "Playlist Two")];
    render(<HomePlaylistList items={items} onPlaylistClick={vi.fn()} />);

    expect(screen.getByText("Playlist One")).not.toBeNull();
    expect(screen.getByText("Playlist Two")).not.toBeNull();
  });

  it("calls onPlaylistClick with the correct id when a card is clicked", () => {
    const onClick = vi.fn();
    const items = [makeItem("p1", "Clickable Playlist")];
    render(<HomePlaylistList items={items} onPlaylistClick={onClick} />);

    const button = screen.getByRole("button");
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledWith("p1");
  });

  it("renders nothing when items list is empty", () => {
    const { container } = render(<HomePlaylistList items={[]} onPlaylistClick={vi.fn()} />);
    expect(container.querySelectorAll("button")).toHaveLength(0);
  });
});
