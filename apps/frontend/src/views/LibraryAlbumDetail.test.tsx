import { LibraryArtist } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LibraryAlbumDetail } from "./LibraryAlbumDetail";

const mockUseLibraryArtistQuery = vi.fn();
const mockPlayQueue = vi.fn();

vi.mock("@/hooks/queries/useLibraryArtistQuery", () => ({
  useLibraryArtistQuery: (name: string) => mockUseLibraryArtistQuery(name),
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock("@/hooks/queries/useDownloadStatus", () => ({
  useBulkTrackStatus: () => new Map(),
}));

vi.mock("@/components/molecules/SpotifyLinkButton", () => ({
  SpotifyLinkButton: () => null,
}));

vi.mock("@/components/molecules/VirtualList", () => ({
  VirtualList: ({
    items,
    renderItem,
  }: {
    items: Array<{ id: string }>;
    renderItem: (item: { id: string }, index: number) => ReactNode;
  }) => (
    <div>
      {items.map((item, index) => (
        <div key={item.id}>{renderItem(item, index)}</div>
      ))}
    </div>
  ),
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

const renderLibraryAlbumDetail = () =>
  render(
    <MemoryRouter initialEntries={["/library/artist/Sigur%20R%C3%B3s/album/%28%20%29"]}>
      <Routes>
        <Route path="/library/artist/:name/album/:albumName" element={<LibraryAlbumDetail />} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  vi.restoreAllMocks();
  mockUseLibraryArtistQuery.mockReset();
  mockPlayQueue.mockReset();
});

describe("LibraryAlbumDetail", () => {
  it("renders not-found UX when album is missing", () => {
    mockUseLibraryArtistQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    renderLibraryAlbumDetail();

    expect(screen.getByText("library.album.notFound")).toBeTruthy();
    expect(screen.getByRole("link", { name: "library.album.backToArtist" })).toBeTruthy();
  });

  it("renders track list and play button when album has tracks", () => {
    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    const { container } = renderLibraryAlbumDetail();

    expect(screen.getByText("Vaka")).toBeTruthy();
    expect(screen.getByText("Fyrsta")).toBeTruthy();

    // No page-local <audio> element — global player bar owns it
    expect(container.querySelector("audio")).toBeNull();
  });

  it("dispatches playQueue to store when a track play button is clicked", () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    renderLibraryAlbumDetail();

    const playButtons = screen.getAllByRole("button", { name: "library.album.playTrack" });
    playButtons[0]!.click();

    expect(mockPlayQueue).toHaveBeenCalledTimes(1);

    const [items, startIndex] = mockPlayQueue.mock.calls[0] as [
      Array<{ id: string; audioUrl: string }>,
      number,
    ];

    expect(startIndex).toBe(0);
    expect(items).toHaveLength(2);
    expect(items[0]!.audioUrl).toContain("/api/library/audio?path=");
  });

  it("renders play album button when album has playable tracks", () => {
    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    renderLibraryAlbumDetail();

    expect(screen.getByRole("button", { name: "library.album.playAlbum" })).toBeTruthy();
  });

  it("renders loading state", () => {
    mockUseLibraryArtistQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    renderLibraryAlbumDetail();

    expect(screen.getByText("library.album.loading")).toBeTruthy();
  });
});
