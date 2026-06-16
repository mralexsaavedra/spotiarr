import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";

const mockNavigate = vi.fn();
const mockNavigateToAlbumPreview = vi.fn();
const mockUseReleasesQuery = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/queries/useReleasesQuery", () => ({
  useReleasesQuery: () => mockUseReleasesQuery(),
}));

vi.mock("@/hooks/useAlbumPreviewNavigation", () => ({
  useAlbumPreviewNavigation: () => ({
    navigateToAlbumPreview: mockNavigateToAlbumPreview,
  }),
}));

const { useReleasesController } = await import("./useReleasesController");

const makeRelease = (overrides = {}) => ({
  artistId: "artist-1",
  artistName: "Radiohead",
  artistImageUrl: null,
  albumId: "album-1",
  albumName: "OK Computer",
  albumType: "album" as const,
  releaseDate: "1997-06-21",
  coverUrl: null,
  spotifyUrl: "https://open.spotify.com/album/abc",
  totalTracks: 12,
  ...overrides,
});

describe("useReleasesController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseReleasesQuery.mockReturnValue({
      releases: [makeRelease()],
      isLoading: false,
      error: null,
    });
  });

  it("handleReleaseClick calls navigateToAlbumPreview with the release", () => {
    const { result } = renderHook(() => useReleasesController());
    const release = makeRelease();

    act(() => {
      result.current.handleReleaseClick(release);
    });

    expect(mockNavigateToAlbumPreview).toHaveBeenCalledWith(release);
  });

  it("handleArtistClick navigates to ARTIST_DETAIL with id replaced", () => {
    const { result } = renderHook(() => useReleasesController());

    act(() => {
      result.current.handleArtistClick("artist-42");
    });

    expect(mockNavigate).toHaveBeenCalledWith(Path.ARTIST_DETAIL.replace(":id", "artist-42"));
  });

  it("passes releases, isLoading, and error through from query", () => {
    const releases = [makeRelease()];
    mockUseReleasesQuery.mockReturnValue({
      releases,
      isLoading: true,
      error: "SERVER_ERROR",
    });

    const { result } = renderHook(() => useReleasesController());

    expect(result.current.releases).toEqual(releases);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe("SERVER_ERROR");
  });
});
