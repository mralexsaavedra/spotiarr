import type { SpotifyPlaylist } from "@spotiarr/shared";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MyPlaylists } from "./MyPlaylists";

const mockUseMyPlaylistsController = vi.fn();

vi.mock("@/hooks/controllers/useMyPlaylistsController", () => ({
  useMyPlaylistsController: () => mockUseMyPlaylistsController(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("@/components/atoms/Loading", () => ({
  Loading: () => <div data-testid="loading" />,
}));

vi.mock("@/components/molecules/ApiErrorState", () => ({
  ApiErrorState: () => <div data-testid="api-error" />,
}));

vi.mock("@/components/organisms/SpotifyPlaylistList", () => ({
  SpotifyPlaylistList: ({ playlists }: { playlists: unknown[] }) => (
    <div data-testid="spotify-playlist-list" data-count={playlists.length} />
  ),
}));

vi.mock("@/components/molecules/PageHeader", () => ({
  PageHeader: () => null,
}));

vi.mock("@/components/molecules/SearchInput", () => ({
  SearchInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input data-testid="search-input" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

vi.mock("@/services/httpClient", () => ({
  ApiError: class ApiError extends Error {
    code?: string;
    constructor(message: string, code?: string) {
      super(message);
      this.code = code;
    }
  },
}));

const makePlaylist = (id: string): SpotifyPlaylist => ({
  id,
  name: `Playlist ${id}`,
  image: null,
  owner: "test-owner",
  tracks: 10,
  spotifyUrl: `https://open.spotify.com/playlist/${id}`,
});

const defaultController = {
  filteredPlaylists: [],
  isLoading: false,
  error: null,
  search: "",
  handleSearchChange: vi.fn(),
  handlePlaylistClick: vi.fn(),
};

describe("MyPlaylists", () => {
  it("shows ApiErrorState when error is set", () => {
    mockUseMyPlaylistsController.mockReturnValue({
      ...defaultController,
      error: new Error("Unauthorized"),
    });

    render(<MyPlaylists />);

    expect(screen.getByTestId("api-error")).toBeTruthy();
    expect(screen.queryByTestId("spotify-playlist-list")).toBeNull();
  });

  it("shows Loading when isLoading is true", () => {
    mockUseMyPlaylistsController.mockReturnValue({
      ...defaultController,
      isLoading: true,
    });

    render(<MyPlaylists />);

    expect(screen.getByTestId("loading")).toBeTruthy();
    expect(screen.queryByTestId("spotify-playlist-list")).toBeNull();
  });

  it("shows empty state text when no playlists", () => {
    mockUseMyPlaylistsController.mockReturnValue({
      ...defaultController,
      filteredPlaylists: [],
    });

    render(<MyPlaylists />);

    expect(screen.getByText("myPlaylists.empty")).toBeTruthy();
    expect(screen.queryByTestId("spotify-playlist-list")).toBeNull();
  });

  it("renders SpotifyPlaylistList when playlists are present", () => {
    const playlists = [makePlaylist("1"), makePlaylist("2"), makePlaylist("3")];
    mockUseMyPlaylistsController.mockReturnValue({
      ...defaultController,
      filteredPlaylists: playlists,
    });

    render(<MyPlaylists />);

    const list = screen.getByTestId("spotify-playlist-list");
    expect(list).toBeTruthy();
    expect(list.getAttribute("data-count")).toBe("3");
  });

  it("calls handleSearchChange when typing in search", () => {
    const handleSearchChange = vi.fn();
    mockUseMyPlaylistsController.mockReturnValue({
      ...defaultController,
      handleSearchChange,
    });

    render(<MyPlaylists />);

    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "chill" } });
    expect(handleSearchChange).toHaveBeenCalledWith("chill");
  });
});
