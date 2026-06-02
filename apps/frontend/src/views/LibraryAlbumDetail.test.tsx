import { LibraryArtist } from "@spotiarr/shared";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LibraryAlbumDetail } from "./LibraryAlbumDetail";

const mockUseLibraryArtistQuery = vi.fn();

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

const instrumentAudioElement = (audio: HTMLAudioElement) => {
  let srcValue = "";
  let currentTimeValue = 0;
  let mediaError: MediaError | null = null;

  Object.defineProperty(audio, "src", {
    configurable: true,
    get: () => srcValue,
    set: (value: string) => {
      srcValue = value;
      currentTimeValue = 0;
    },
  });

  Object.defineProperty(audio, "currentTime", {
    configurable: true,
    get: () => currentTimeValue,
    set: (value: number) => {
      currentTimeValue = value;
    },
  });

  Object.defineProperty(audio, "error", {
    configurable: true,
    get: () => mediaError,
    set: (value: MediaError | null) => {
      mediaError = value;
    },
  });
};

afterEach(() => {
  vi.restoreAllMocks();
  mockUseLibraryArtistQuery.mockReset();
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

  it("starts playback and resumes same track after pause", async () => {
    const playMock = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pauseMock = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    const { container } = renderLibraryAlbumDetail();
    const audio = container.querySelector("audio");

    instrumentAudioElement(audio!);

    fireEvent.click(screen.getAllByRole("button", { name: "library.album.playTrack" })[0]!);

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    expect(audio?.src ?? "").toContain("/api/library/audio?path=");

    fireEvent.play(audio!);
    audio!.currentTime = 73;
    fireEvent.click(screen.getByRole("button", { name: "library.album.pauseTrack" }));

    expect(pauseMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getAllByRole("button", { name: "library.album.playTrack" })[0]!);

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(2));
    expect(audio?.currentTime).toBe(73);
  });

  it("switches tracks and pauses active audio on unmount", async () => {
    const playMock = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    const pauseMock = vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    const { container, unmount } = renderLibraryAlbumDetail();
    const audio = container.querySelector("audio");

    instrumentAudioElement(audio!);

    fireEvent.click(screen.getAllByRole("button", { name: "library.album.playTrack" })[0]!);
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));
    fireEvent.play(audio!);

    fireEvent.click(screen.getAllByRole("button", { name: "library.album.playTrack" })[0]!);

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(2));
    expect(audio?.src ?? "").toContain("%2Ftmp%2F02.mp3");

    unmount();

    expect(pauseMock).toHaveBeenCalled();
  });

  it("shows truthful assertive playback feedback for blocked play and generic media errors", async () => {
    const playMock = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockRejectedValueOnce(new DOMException("Playback blocked", "NotAllowedError"))
      .mockResolvedValue(undefined);

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    const { container } = renderLibraryAlbumDetail();
    const audio = container.querySelector("audio");

    instrumentAudioElement(audio!);

    fireEvent.click(screen.getAllByRole("button", { name: "library.album.playTrack" })[0]!);

    const rejectionAlert = await screen.findByRole("alert");
    expect(rejectionAlert.textContent).toBe("library.album.playbackBlocked");

    fireEvent.click(screen.getAllByRole("button", { name: "library.album.playTrack" })[0]!);
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(2));

    Object.defineProperty(audio, "error", {
      configurable: true,
      value: { code: 2 } as MediaError,
    });
    fireEvent.error(audio!);

    const mediaErrorAlert = await screen.findByRole("alert");
    expect(mediaErrorAlert.textContent).toBe("library.album.playbackFailed");
  });

  it("shows unsupported playback feedback for NotSupportedError rejections", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValueOnce(
      new DOMException("Unsupported", "NotSupportedError"),
    );

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    const { container } = renderLibraryAlbumDetail();
    const audio = container.querySelector("audio");

    instrumentAudioElement(audio!);

    fireEvent.click(screen.getAllByRole("button", { name: "library.album.playTrack" })[0]!);

    const unsupportedAlert = await screen.findByRole("alert");
    expect(unsupportedAlert.textContent).toBe("library.album.playbackUnsupported");
  });

  it("treats media element source support errors as unavailable playback sources", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    const { container } = renderLibraryAlbumDetail();
    const audio = container.querySelector("audio");

    instrumentAudioElement(audio!);

    fireEvent.click(screen.getAllByRole("button", { name: "library.album.playTrack" })[0]!);
    Object.defineProperty(audio, "error", {
      configurable: true,
      value: { code: 4 } as MediaError,
    });
    fireEvent.error(audio!);

    const failureAlert = await screen.findByRole("alert");
    expect(failureAlert.textContent).toBe("library.album.playbackUnavailable");
  });

  it("ignores stale AbortError rejections from an interrupted prior track", async () => {
    const firstPlayController: { reject: null | ((reason?: unknown) => void) } = { reject: null };

    const playMock = vi
      .spyOn(HTMLMediaElement.prototype, "play")
      .mockImplementationOnce(
        () =>
          new Promise<void>((_, reject) => {
            firstPlayController.reject = reject;
          }),
      )
      .mockResolvedValue(undefined);

    mockUseLibraryArtistQuery.mockReturnValue({
      data: makeArtist(),
      isLoading: false,
      error: null,
    });

    const { container } = renderLibraryAlbumDetail();
    const audio = container.querySelector("audio");

    instrumentAudioElement(audio!);

    fireEvent.click(screen.getAllByRole("button", { name: "library.album.playTrack" })[0]!);
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getAllByRole("button", { name: "library.album.playTrack" })[1]!);
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(2));

    if (firstPlayController.reject) {
      firstPlayController.reject(new DOMException("Interrupted", "AbortError"));
    }
    await waitFor(() => expect(audio?.src ?? "").toContain("%2Ftmp%2F02.mp3"));

    expect(screen.queryByRole("alert")).toBeNull();
  });
});
