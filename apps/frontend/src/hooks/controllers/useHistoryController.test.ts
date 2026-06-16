import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";

const mockNavigate = vi.fn();
const mockUseDownloadHistoryQuery = vi.fn();
const mockUsePlaylistsQuery = vi.fn();
const mockUseRecreatePlaylistMutation = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/queries/useDownloadHistoryQuery", () => ({
  useDownloadHistoryQuery: () => mockUseDownloadHistoryQuery(),
}));

vi.mock("@/hooks/queries/usePlaylistsQuery", () => ({
  usePlaylistsQuery: () => mockUsePlaylistsQuery(),
}));

vi.mock("@/hooks/mutations/useRecreatePlaylistMutation", () => ({
  useRecreatePlaylistMutation: () => mockUseRecreatePlaylistMutation(),
}));

const { useHistoryController } = await import("./useHistoryController");

const makeHistoryItem = (overrides = {}) => ({
  playlistId: "pl-1",
  playlistName: "My Playlist",
  playlistSpotifyUrl: "https://open.spotify.com/playlist/abc",
  trackCount: 10,
  lastCompletedAt: Date.now(),
  ...overrides,
});

const makeActivePlaylist = (overrides = {}) => ({
  id: "pl-1",
  name: "My Playlist",
  spotifyUrl: "https://open.spotify.com/playlist/abc",
  type: "playlist" as any,
  subscribed: true,
  createdAt: Date.now(),
  ...overrides,
});

const mockMutate = vi.fn();

describe("useHistoryController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDownloadHistoryQuery.mockReturnValue({ data: [], isLoading: false });
    mockUsePlaylistsQuery.mockReturnValue({ data: [] });
    mockUseRecreatePlaylistMutation.mockReturnValue({ mutate: mockMutate, isPending: false });
  });

  it("handleHistoryItemClick navigates to PLAYLIST_DETAIL when activePlaylist is provided", () => {
    const { result } = renderHook(() => useHistoryController());
    const item = makeHistoryItem();
    const activePlaylist = makeActivePlaylist({ id: "pl-1" });

    act(() => {
      result.current.handleHistoryItemClick(item, activePlaylist as any);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      Path.PLAYLIST_DETAIL.replace(":id", activePlaylist.id),
    );
  });

  it("handleHistoryItemClick navigates to PLAYLIST_PREVIEW when no activePlaylist and has spotifyUrl", () => {
    const { result } = renderHook(() => useHistoryController());
    const item = makeHistoryItem({ playlistSpotifyUrl: "https://open.spotify.com/playlist/xyz" });

    act(() => {
      result.current.handleHistoryItemClick(item, undefined);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      `${Path.PLAYLIST_PREVIEW}?url=${encodeURIComponent(item.playlistSpotifyUrl!)}`,
    );
  });

  it("handleHistoryItemClick does nothing when no activePlaylist and no spotifyUrl", () => {
    const { result } = renderHook(() => useHistoryController());
    const item = makeHistoryItem({ playlistSpotifyUrl: null });

    act(() => {
      result.current.handleHistoryItemClick(item, undefined);
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("handleRecreatePlaylistClick calls recreatePlaylist.mutate with playlistSpotifyUrl", () => {
    const { result } = renderHook(() => useHistoryController());
    const spotifyUrl = "https://open.spotify.com/playlist/abc";
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleRecreatePlaylistClick(event, spotifyUrl);
    });

    expect(mockMutate).toHaveBeenCalledWith(spotifyUrl);
  });

  it("handleRecreatePlaylistClick does nothing when playlistSpotifyUrl is null", () => {
    const { result } = renderHook(() => useHistoryController());
    const event = {
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.MouseEvent<HTMLButtonElement>;

    act(() => {
      result.current.handleRecreatePlaylistClick(event, null);
    });

    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("history and isLoading come from query", () => {
    const historyItem = makeHistoryItem();
    mockUseDownloadHistoryQuery.mockReturnValue({
      data: [historyItem],
      isLoading: true,
    });

    const { result } = renderHook(() => useHistoryController());

    expect(result.current.history).toEqual([historyItem]);
    expect(result.current.isLoading).toBe(true);
  });
});
