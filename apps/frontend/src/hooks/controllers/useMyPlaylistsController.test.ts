import { SpotifyPlaylist } from "@spotiarr/shared";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";
import { useMyPlaylistsController } from "./useMyPlaylistsController";

const mockNavigate = vi.fn();
const mockUseMyPlaylistsQuery = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/queries/useMyPlaylistsQuery", () => ({
  useMyPlaylistsQuery: () => mockUseMyPlaylistsQuery(),
}));

vi.mock("../useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

const spotifyPlaylist: SpotifyPlaylist = {
  id: "spotify-playlist-1",
  name: "Road Trip",
  image: null,
  owner: "Alex",
  tracks: 12,
  spotifyUrl: "https://open.spotify.com/playlist/road-trip",
};

describe("useMyPlaylistsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMyPlaylistsQuery.mockReturnValue({
      data: [spotifyPlaylist],
      isLoading: false,
      error: null,
    });
  });

  it("navigates to playlist preview regardless of saved/subscribed state", () => {
    const { result } = renderHook(() => useMyPlaylistsController());

    act(() => {
      result.current.handlePlaylistClick(spotifyPlaylist.id);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      `${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(spotifyPlaylist.spotifyUrl)}`,
    );
  });
});
