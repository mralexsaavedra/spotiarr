import { ApiRoutes, LibraryArtist, PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { act, renderHook } from "@testing-library/react";
import { generatePath } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";
import { useLibraryAlbumDetailController } from "./useLibraryAlbumDetailController";

const mockUseParams = vi.fn();
const mockUseLibraryArtistQuery = vi.fn();
const mockPlayQueue = vi.fn();

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

vi.mock("@/store/usePlayerStore", () => ({
  usePlayerStore: Object.assign(
    vi.fn(
      (
        selector: (state: {
          isPlaying: boolean;
          currentIndex: number | null;
          queue: Array<{ id: string }>;
        }) => unknown,
      ) => selector({ isPlaying: false, currentIndex: null, queue: [] }),
    ),
    {
      getState: vi.fn(() => ({ playQueue: mockPlayQueue, togglePlay: vi.fn() })),
    },
  ),
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
          duration: 180,
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
          duration: 245,
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
    expect(result.current.tracks[0]?.durationMs).toBe(180000);
    expect(result.current.tracks[1]?.durationMs).toBe(245000);
    expect(result.current.tracks[0]?.trackUrl).toBe("/api/library/audio?path=%2Ftmp%2F01.mp3");
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

  it("dispatches playQueue to usePlayerStore with normalized QueueItems when onPlayTrack is called", () => {
    mockUseParams.mockReturnValue({
      name: "Sigur%20R%C3%B3s",
      albumName: "%28%20%29",
    });

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    mockPlayQueue.mockClear();

    const { result } = renderHook(() => useLibraryAlbumDetailController());

    act(() => {
      result.current.onPlayTrack(result.current.tracks[1]!.id);
    });

    expect(mockPlayQueue).toHaveBeenCalledTimes(1);

    const [items, startIndex] = mockPlayQueue.mock.calls[0] as [
      Array<{ id: string; audioUrl: string; name: string; artist: string }>,
      number,
    ];

    expect(startIndex).toBe(1);
    expect(items).toHaveLength(2);

    // audioUrl is normalized from track.trackUrl
    expect(items[0]!.audioUrl).toBe(
      `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/audio?path=${encodeURIComponent("/tmp/01.mp3")}`,
    );
    expect(items[1]!.audioUrl).toBe(
      `${ApiRoutes.BASE}${ApiRoutes.LIBRARY}/audio?path=${encodeURIComponent("/tmp/02.mp3")}`,
    );

    // QueueItem fields
    expect(items[0]!.name).toBe("Vaka");
    expect(items[0]!.artist).toBe("Sigur Rós");
  });

  it("dispatches playQueue starting at index 0 when onPlayPlaylist is called with no current track", () => {
    mockUseParams.mockReturnValue({
      name: "Sigur%20R%C3%B3s",
      albumName: "%28%20%29",
    });

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    mockPlayQueue.mockClear();

    const { result } = renderHook(() => useLibraryAlbumDetailController());

    act(() => {
      result.current.onPlayPlaylist();
    });

    expect(mockPlayQueue).toHaveBeenCalledTimes(1);
    const [, startIndex] = mockPlayQueue.mock.calls[0] as [unknown[], number];
    expect(startIndex).toBe(0);
  });

  // T1.3 — artworkUrl regression: library album controller is unaffected
  it("[T1.3] dispatched QueueItems carry artworkUrl equal to coverUrl", () => {
    mockUseParams.mockReturnValue({
      name: "Sigur%20R%C3%B3s",
      albumName: "%28%20%29",
    });

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    mockPlayQueue.mockClear();

    const { result } = renderHook(() => useLibraryAlbumDetailController());

    act(() => {
      result.current.onPlayTrack(result.current.tracks[0]!.id);
    });

    expect(mockPlayQueue).toHaveBeenCalledTimes(1);

    const [items] = mockPlayQueue.mock.calls[0] as [
      Array<{ id: string; artworkUrl?: string }>,
      number,
    ];

    // All items should carry artworkUrl equal to the album's coverUrl
    const expectedCoverUrl = result.current.coverUrl;
    items.forEach((item) => {
      expect(item.artworkUrl).toBe(expectedCoverUrl);
    });
  });

  it("does not expose audioRef, audioSrc, or playbackError in return shape", () => {
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

    expect("audioSrc" in result.current).toBe(false);
    expect("playbackError" in result.current).toBe(false);
    expect("setAudioElement" in result.current).toBe(false);
    expect("onAudioPlay" in result.current).toBe(false);
    expect("onAudioPause" in result.current).toBe(false);
    expect("onAudioError" in result.current).toBe(false);
  });
});
