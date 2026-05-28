import { LibraryArtist, PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { renderHook } from "@testing-library/react";
import { generatePath } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";
import { useLibraryAlbumDetailController } from "./useLibraryAlbumDetailController";

const mockUseParams = vi.fn();
const mockUseLibraryArtistQuery = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useParams: () => mockUseParams(),
  };
});

vi.mock("@/hooks/queries/useLibraryArtistQuery", () => ({
  useLibraryArtistQuery: (name: string) => mockUseLibraryArtistQuery(name),
}));

const makeArtist = (): LibraryArtist => ({
  name: "Sigur Rós",
  path: "/library/sigur-ros",
  image: "covers/sigur.jpg",
  albumCount: 1,
  trackCount: 2,
  totalSize: 300,
  albums: [
    {
      name: "( )",
      path: "/library/sigur-ros/()",
      artist: "Sigur Rós",
      trackCount: 2,
      totalSize: 300,
      year: 2002,
      image: "covers/album.jpg",
      tracks: [
        {
          fileName: "01.mp3",
          filePath: "/tmp/01.mp3",
          trackNumber: 1,
          name: "Vaka",
          artist: "Sigur Rós",
          album: "( )",
          format: "mp3",
          size: 100,
          modifiedAt: 1,
        },
        {
          fileName: "02.mp3",
          filePath: "/tmp/02.mp3",
          trackNumber: 2,
          name: "Fyrsta",
          artist: "Sigur Rós",
          album: "( )",
          format: "mp3",
          size: 200,
          modifiedAt: 2,
        },
      ],
    },
  ],
});

describe("useLibraryAlbumDetailController", () => {
  it("decodes params, resolves album and maps tracks to AlbumPageLayout shape", () => {
    mockUseParams.mockReturnValue({
      name: "Sigur%20R%C3%B3s",
      albumName: "%28%20%29",
    });

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useLibraryAlbumDetailController());

    expect(mockUseLibraryArtistQuery).toHaveBeenCalledWith("Sigur Rós");
    expect(result.current.album?.name).toBe("( )");
    expect(result.current.playlistType).toBe(PlaylistTypeEnum.Album);
    expect(result.current.coverUrl).toContain("/api/library/image?path=");
    expect(result.current.tracks).toHaveLength(2);
    expect(result.current.tracks[0]?.status).toBe(TrackStatusEnum.Completed);
  });

  it("builds back link with raw artist name and router handles encoding once", () => {
    const artistName = "Café del Mar / 100% Hits";

    mockUseParams.mockReturnValue({
      name: artistName,
      albumName: "Best Of",
    });

    mockUseLibraryArtistQuery.mockReturnValue({
      data: {
        ...makeArtist(),
        name: artistName,
      },
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useLibraryAlbumDetailController());

    expect(result.current.backToArtistPath).toBe(
      generatePath(Path.LIBRARY_ARTIST, {
        name: artistName,
      }),
    );
    expect(result.current.backToArtistPath).toContain(
      "Caf%C3%A9%20del%20Mar%20%2F%20100%25%20Hits",
    );
    expect(result.current.backToArtistPath).not.toContain("%2525");
  });

  it("returns not-found state when album does not exist", () => {
    mockUseParams.mockReturnValue({ name: "Sigur%20R%C3%B3s", albumName: "missing" });

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useLibraryAlbumDetailController());

    expect(result.current.album).toBeUndefined();
    expect(result.current.isNotFound).toBe(true);
    expect(result.current.tracks).toEqual([]);
  });
});
