import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";

const mockNavigate = vi.fn();
const mockUseFollowedArtistsQuery = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/queries/useFollowedArtistsQuery", () => ({
  useFollowedArtistsQuery: () => mockUseFollowedArtistsQuery(),
}));

vi.mock("../useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

const { useArtistsController } = await import("./useArtistsController");

const makeArtist = (id: string, name: string) => ({
  id,
  name,
  image: null,
  spotifyUrl: `https://open.spotify.com/artist/${id}`,
});

describe("useArtistsController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFollowedArtistsQuery.mockReturnValue({
      artists: [makeArtist("1", "Radiohead"), makeArtist("2", "Arcade Fire")],
      isLoading: false,
      error: null,
    });
  });

  it("returns all artists when search is empty", () => {
    const { result } = renderHook(() => useArtistsController());

    expect(result.current.filteredArtists).toHaveLength(2);
  });

  it("filters by name case-insensitively", () => {
    const { result } = renderHook(() => useArtistsController());

    act(() => {
      result.current.handleSearchChange("radio");
    });

    expect(result.current.filteredArtists).toHaveLength(1);
    expect(result.current.filteredArtists[0]!.name).toBe("Radiohead");
  });

  it("returns empty array when no artist matches the search", () => {
    const { result } = renderHook(() => useArtistsController());

    act(() => {
      result.current.handleSearchChange("zzznomatch");
    });

    expect(result.current.filteredArtists).toHaveLength(0);
  });

  it("handleArtistClick navigates to ARTIST_DETAIL with id replaced", () => {
    const { result } = renderHook(() => useArtistsController());

    act(() => {
      result.current.handleArtistClick("42");
    });

    expect(mockNavigate).toHaveBeenCalledWith(Path.ARTIST_DETAIL.replace(":id", "42"));
  });

  it("returns empty array when artists is null", () => {
    mockUseFollowedArtistsQuery.mockReturnValue({
      artists: null,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useArtistsController());

    expect(result.current.filteredArtists).toHaveLength(0);
  });

  it("passes isLoading and error through from query", () => {
    mockUseFollowedArtistsQuery.mockReturnValue({
      artists: [],
      isLoading: true,
      error: "NOT_FOUND",
    });

    const { result } = renderHook(() => useArtistsController());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe("NOT_FOUND");
  });
});
