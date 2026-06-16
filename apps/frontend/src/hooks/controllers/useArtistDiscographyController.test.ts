import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/queries/useArtistAlbumsQuery", () => ({
  useArtistAlbumsQuery: () => ({ data: [], isFetching: false }),
}));

const { useArtistDiscographyController } = await import("./useArtistDiscographyController");

const makeRelease = (albumId: string, albumType: string, releaseDate: string) => ({
  artistId: "artist-1",
  artistName: "Radiohead",
  artistImageUrl: null,
  albumId,
  albumName: `Album ${albumId}`,
  albumType: albumType as any,
  releaseDate,
  coverUrl: null,
  spotifyUrl: undefined,
  totalTracks: 10,
});

const albums = [
  makeRelease("a1", "album", "2020-01-01"),
  makeRelease("a2", "single", "2021-06-15"),
  makeRelease("a3", "ep", "2019-03-10"),
  makeRelease("a4", "album", "2022-11-20"),
  makeRelease("a5", "compilation", "2018-07-05"),
];

describe("useArtistDiscographyController", () => {
  const defaultProps = {
    artistId: "artist-1",
    initialAlbums: albums,
    pageSize: 3,
    hasMore: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns all albums sorted by releaseDate descending when filter is 'all'", () => {
    const { result } = renderHook(() => useArtistDiscographyController(defaultProps));

    const dates = result.current.filteredAlbums.map((a) => a.releaseDate);
    expect(dates).toEqual(["2022-11-20", "2021-06-15", "2020-01-01", "2019-03-10", "2018-07-05"]);
  });

  it("filters singles and eps when filter is 'single'", () => {
    const { result } = renderHook(() => useArtistDiscographyController(defaultProps));

    act(() => {
      result.current.setFilter("single");
    });

    const types = result.current.filteredAlbums.map((a) => a.albumType);
    expect(types.every((t) => t === "single" || t === "ep")).toBe(true);
    expect(result.current.filteredAlbums).toHaveLength(2);
  });

  it("filters only albums when filter is 'album'", () => {
    const { result } = renderHook(() => useArtistDiscographyController(defaultProps));

    act(() => {
      result.current.setFilter("album");
    });

    const types = result.current.filteredAlbums.map((a) => a.albumType);
    expect(types.every((t) => t === "album")).toBe(true);
    expect(result.current.filteredAlbums).toHaveLength(2);
  });

  it("visibleItems starts at pageSize", () => {
    const { result } = renderHook(() => useArtistDiscographyController(defaultProps));

    expect(result.current.visibleItems).toBe(3);
  });

  it("handleShowMore increments visibleItems by pageSize", () => {
    const { result } = renderHook(() => useArtistDiscographyController(defaultProps));

    act(() => {
      result.current.handleShowMore();
    });

    expect(result.current.visibleItems).toBe(6);
  });

  it("canShowMore is true when more items exist beyond visibleItems", () => {
    const { result } = renderHook(() =>
      useArtistDiscographyController({ ...defaultProps, pageSize: 2 }),
    );

    // 5 albums, pageSize 2, visibleItems starts at 2 → 3 more remain
    expect(result.current.canShowMore).toBe(true);
  });

  it("canShowMore is false when all items are visible and hasFetchedAll", () => {
    const smallAlbums = [makeRelease("b1", "album", "2020-01-01")];

    const { result } = renderHook(() =>
      useArtistDiscographyController({
        artistId: "artist-1",
        initialAlbums: smallAlbums,
        pageSize: 5,
        hasMore: false,
      }),
    );

    // 1 album, pageSize 5 → visibleItems = 5, filteredAlbums.length = 1 → canShowMore false
    expect(result.current.canShowMore).toBe(false);
  });
});
