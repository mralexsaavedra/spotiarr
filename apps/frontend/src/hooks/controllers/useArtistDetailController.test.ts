import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";

const mockNavigate = vi.fn();
const mockNavigateToAlbumPreview = vi.fn();
const mockUseArtistDetailQuery = vi.fn();
const mockUsePlaylistDownloaded = vi.fn();
const mockUseCreatePlaylistMutation = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ id: "artist-current" }),
  };
});

vi.mock("@/hooks/queries/useArtistDetailQuery", () => ({
  useArtistDetailQuery: () => mockUseArtistDetailQuery(),
}));

vi.mock("@/hooks/queries/useDownloadStatus", () => ({
  usePlaylistDownloaded: (url: string | undefined) => mockUsePlaylistDownloaded(url),
}));

vi.mock("@/hooks/mutations/useCreatePlaylistMutation", () => ({
  useCreatePlaylistMutation: () => mockUseCreatePlaylistMutation(),
}));

vi.mock("@/hooks/useAlbumPreviewNavigation", () => ({
  useAlbumPreviewNavigation: () => ({
    navigateToAlbumPreview: mockNavigateToAlbumPreview,
  }),
}));

vi.mock("./useArtistDiscographyController", () => ({
  useArtistDiscographyController: () => ({
    filter: "all",
    setFilter: vi.fn(),
    filteredAlbums: [],
    visibleItems: 8,
    isLoadingMore: false,
    handleShowMore: vi.fn(),
    canShowMore: false,
  }),
}));

vi.mock("@/hooks/useGridColumns", () => ({
  useGridColumns: () => 4,
}));

const { useArtistDetailController } = await import("./useArtistDetailController");

const makeArtist = (overrides = {}) => ({
  id: "artist-current",
  name: "Radiohead",
  image: "https://image.url",
  spotifyUrl: "https://open.spotify.com/artist/abc",
  followers: 1000000,
  genres: ["alternative rock"],
  albums: [],
  isFollowed: true,
  catalogRefreshPending: false,
  ...overrides,
});

describe("useArtistDetailController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseArtistDetailQuery.mockReturnValue({
      artist: makeArtist(),
      isLoading: false,
      error: null,
    });
    mockUsePlaylistDownloaded.mockReturnValue(false);
    mockUseCreatePlaylistMutation.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
      isSuccess: false,
    });
  });

  it("hasArtist is true when artist exists, id exists, and no error", () => {
    const { result } = renderHook(() => useArtistDetailController());

    expect(result.current.hasArtist).toBe(true);
  });

  it("hasArtist is false when artist is null", () => {
    mockUseArtistDetailQuery.mockReturnValue({
      artist: null,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useArtistDetailController());

    expect(result.current.hasArtist).toBe(false);
  });

  it("handleArtistClick navigates to ARTIST_DETAIL for a different artist id", () => {
    const { result } = renderHook(() => useArtistDetailController());

    act(() => {
      result.current.handleArtistClick("artist-other");
    });

    expect(mockNavigate).toHaveBeenCalledWith(Path.ARTIST_DETAIL.replace(":id", "artist-other"));
  });

  it("handleArtistClick does nothing for the same artist id", () => {
    const { result } = renderHook(() => useArtistDetailController());

    act(() => {
      result.current.handleArtistClick("artist-current");
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("handleNavigate calls navigateToAlbumPreview with the album", () => {
    const { result } = renderHook(() => useArtistDetailController());
    const album = {
      artistId: "artist-current",
      artistName: "Radiohead",
      artistImageUrl: null,
      albumId: "album-1",
      albumName: "OK Computer",
      releaseDate: "1997-06-21",
      coverUrl: null,
    };

    act(() => {
      result.current.handleNavigate(album as any);
    });

    expect(mockNavigateToAlbumPreview).toHaveBeenCalledWith(album);
  });

  it("isArtistDownloaded reflects usePlaylistDownloaded", () => {
    mockUsePlaylistDownloaded.mockReturnValue(true);

    const { result } = renderHook(() => useArtistDetailController());

    expect(result.current.isArtistDownloaded).toBe(true);
  });
});
