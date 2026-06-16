import { TrackStatusEnum } from "@spotiarr/shared";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockUseAlbumTracksQuery = vi.fn();
const mockUseArtistAlbumsQuery = vi.fn();
const mockUseBulkTrackStatus = vi.fn();
const mockUsePlaylistController = vi.fn();
const mockHandleGoBack = vi.fn();
const mockHandleGoHome = vi.fn();
const mockCreatePlaylistMutate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ artistId: "artist-1", albumId: "album-1" }),
  };
});

vi.mock("@/hooks/queries/useAlbumTracksQuery", () => ({
  useAlbumTracksQuery: () => mockUseAlbumTracksQuery(),
}));

vi.mock("@/hooks/queries/useArtistAlbumsQuery", () => ({
  useArtistAlbumsQuery: () => mockUseArtistAlbumsQuery(),
}));

vi.mock("@/hooks/queries/useDownloadStatus", () => ({
  useBulkTrackStatus: (urls: (string | null)[]) => mockUseBulkTrackStatus(urls),
}));

vi.mock("./usePlaylistController", () => ({
  usePlaylistController: () => mockUsePlaylistController(),
}));

vi.mock("@/hooks/useNavigationHelpers", () => ({
  useNavigationHelpers: () => ({
    handleGoBack: mockHandleGoBack,
    handleGoHome: mockHandleGoHome,
  }),
}));

const { useAlbumDetailController } = await import("./useAlbumDetailController");

const makeRawTrack = (name: string, trackUrl: string | null = null, album = "OK Computer") => ({
  name,
  artist: "Radiohead",
  album,
  durationMs: 240000,
  trackUrl,
  albumUrl: "https://open.spotify.com/album/abc",
  albumCoverUrl: null,
  previewUrl: null,
  artists: [{ name: "Radiohead", url: "https://open.spotify.com/artist/xyz" }],
  primaryArtist: "Radiohead",
  primaryArtistImage: null,
  unavailable: false,
  albumId: "album-1",
});

const stubPlaylistController = () => ({
  isDownloaded: false,
  isButtonLoading: false,
  hasFailed: false,
  completedCount: 0,
  displayTitle: "OK Computer",
  handleToggleSubscription: vi.fn(),
  handleDelete: vi.fn(),
  handleRetryFailed: vi.fn(),
  handleRetryTrack: vi.fn(),
  mutations: {
    createPlaylist: {
      mutate: mockCreatePlaylistMutate,
      isPending: false,
      isSuccess: false,
    },
  },
});

describe("useAlbumDetailController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAlbumTracksQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    mockUseArtistAlbumsQuery.mockReturnValue({ data: [] });
    mockUseBulkTrackStatus.mockReturnValue(new Map());
    mockUsePlaylistController.mockReturnValue(stubPlaylistController());
  });

  it("tracks is empty when no rawTracks", () => {
    mockUseAlbumTracksQuery.mockReturnValue({ data: [], isLoading: false, error: null });

    const { result } = renderHook(() => useAlbumDetailController());

    expect(result.current.tracks).toHaveLength(0);
  });

  it("tracks maps NormalizedTrack to Track with proper id format 'album-{albumId}-{index}'", () => {
    const rawTracks = [makeRawTrack("Paranoid Android"), makeRawTrack("Karma Police")];
    mockUseAlbumTracksQuery.mockReturnValue({ data: rawTracks, isLoading: false, error: null });

    const { result } = renderHook(() => useAlbumDetailController());

    expect(result.current.tracks[0]!.id).toBe("album-album-1-0");
    expect(result.current.tracks[1]!.id).toBe("album-album-1-1");
    expect(result.current.tracks[0]!.name).toBe("Paranoid Android");
  });

  it("isSaved is false when no completed tracks", () => {
    const rawTracks = [makeRawTrack("Paranoid Android", "https://track.url/1")];
    mockUseAlbumTracksQuery.mockReturnValue({ data: rawTracks, isLoading: false, error: null });
    mockUseBulkTrackStatus.mockReturnValue(new Map([["https://track.url/1", TrackStatusEnum.New]]));

    const { result } = renderHook(() => useAlbumDetailController());

    expect(result.current.isSaved).toBe(false);
  });

  it("isSaved is true when at least one track has status Completed", () => {
    const rawTracks = [makeRawTrack("Paranoid Android", "https://track.url/1")];
    mockUseAlbumTracksQuery.mockReturnValue({ data: rawTracks, isLoading: false, error: null });
    mockUseBulkTrackStatus.mockReturnValue(
      new Map([["https://track.url/1", TrackStatusEnum.Completed]]),
    );

    const { result } = renderHook(() => useAlbumDetailController());

    expect(result.current.isSaved).toBe(true);
  });

  it("handleDownload calls createPlaylist.mutate with kind 'album'", () => {
    const rawTracks = [makeRawTrack("Paranoid Android")];
    mockUseAlbumTracksQuery.mockReturnValue({ data: rawTracks, isLoading: false, error: null });

    const { result } = renderHook(() => useAlbumDetailController());

    act(() => {
      result.current.handleDownload();
    });

    expect(mockCreatePlaylistMutate).toHaveBeenCalledWith({
      kind: "album",
      artistId: "artist-1",
      albumId: "album-1",
    });
  });

  it("handleDownloadTrack extracts track index from track.id and calls mutate with kind 'albumTrack'", () => {
    const rawTracks = [makeRawTrack("Paranoid Android"), makeRawTrack("Karma Police")];
    mockUseAlbumTracksQuery.mockReturnValue({ data: rawTracks, isLoading: false, error: null });

    const { result } = renderHook(() => useAlbumDetailController());

    act(() => {
      result.current.handleDownloadTrack(result.current.tracks[1]!);
    });

    expect(mockCreatePlaylistMutate).toHaveBeenCalledWith({
      kind: "albumTrack",
      artistId: "artist-1",
      albumId: "album-1",
      trackIndex: 1,
    });
  });

  it("playlist is undefined when both album and tracks are empty", () => {
    mockUseAlbumTracksQuery.mockReturnValue({ data: [], isLoading: false, error: null });
    mockUseArtistAlbumsQuery.mockReturnValue({ data: [] });

    const { result } = renderHook(() => useAlbumDetailController());

    expect(result.current.playlist).toBeUndefined();
  });
});
