import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlaylistCard } from "./PlaylistCard";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("../atoms/Image", () => ({ Image: ({ alt }: any) => <img alt={alt} /> }));
vi.mock("../molecules/PlaylistStatusBadge", () => ({
  PlaylistStatusBadge: () => <span data-testid="status-badge" />,
}));

const stats = {
  isDownloading: false,
  hasErrors: false,
  isCompleted: true,
  completedCount: 10,
  totalCount: 10,
  errorCount: 0,
} as any;

describe("PlaylistCard", () => {
  it("renders playlist name", () => {
    const playlist = { id: "pl-1", name: "My Playlist", coverUrl: null, subscribed: false } as any;
    render(<PlaylistCard playlist={playlist} stats={stats} onClick={vi.fn()} />);
    expect(screen.queryByText("My Playlist")).not.toBeNull();
  });

  it("calls onClick with playlist.id when card is clicked", () => {
    const playlist = { id: "pl-1", name: "My Playlist", coverUrl: null, subscribed: false } as any;
    const onClick = vi.fn();
    render(<PlaylistCard playlist={playlist} stats={stats} onClick={onClick} />);
    fireEvent.click(screen.getByTitle("My Playlist"));
    expect(onClick).toHaveBeenCalledWith("pl-1");
  });

  it("shows subscribed bell icon when playlist.subscribed is true", () => {
    const playlist = { id: "pl-1", name: "My Playlist", coverUrl: null, subscribed: true } as any;
    render(<PlaylistCard playlist={playlist} stats={stats} onClick={vi.fn()} />);
    expect(screen.queryByTitle("common.cards.tooltips.subscribed")).not.toBeNull();
  });

  it("does not show bell icon when playlist.subscribed is false", () => {
    const playlist = { id: "pl-1", name: "My Playlist", coverUrl: null, subscribed: false } as any;
    render(<PlaylistCard playlist={playlist} stats={stats} onClick={vi.fn()} />);
    expect(screen.queryByTitle("common.cards.tooltips.subscribed")).toBeNull();
  });

  it("renders fallback text when name is null", () => {
    const playlist = { id: "pl-1", name: null, coverUrl: null, subscribed: false } as any;
    render(<PlaylistCard playlist={playlist} stats={stats} onClick={vi.fn()} />);
    expect(screen.queryAllByText("common.cards.unnamedPlaylist").length).toBeGreaterThan(0);
  });

  it("renders PlaylistStatusBadge", () => {
    const playlist = { id: "pl-1", name: "My Playlist", coverUrl: null, subscribed: false } as any;
    render(<PlaylistCard playlist={playlist} stats={stats} onClick={vi.fn()} />);
    expect(screen.queryByTestId("status-badge")).not.toBeNull();
  });
});
