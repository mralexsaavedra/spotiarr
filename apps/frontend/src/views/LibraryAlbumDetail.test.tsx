import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { LibraryAlbumDetail } from "./LibraryAlbumDetail";

const mockController = vi.fn();

vi.mock("@/hooks/controllers/useLibraryAlbumDetailController", () => ({
  useLibraryAlbumDetailController: () => mockController(),
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

describe("LibraryAlbumDetail", () => {
  it("renders not-found UX when album is missing", () => {
    mockController.mockReturnValue({
      isLoading: false,
      error: null,
      isNotFound: true,
      artistName: "A",
      albumName: "B",
      album: undefined,
      tracks: [],
      coverUrl: undefined,
      playlistType: "album",
      backToArtistPath: "/library/artist/A",
    });

    render(
      <MemoryRouter>
        <LibraryAlbumDetail />
      </MemoryRouter>,
    );

    expect(screen.getByText("library.album.notFound")).toBeTruthy();
    expect(screen.getByRole("link", { name: "library.album.backToArtist" })).toBeTruthy();
  });

  it("does not render back-to-artist link in success state", () => {
    mockController.mockReturnValue({
      isLoading: false,
      error: null,
      isNotFound: false,
      artistName: "A",
      albumName: "B",
      album: {
        name: "B",
        path: "/library/A/B",
        artist: "A",
        trackCount: 1,
        totalSize: 1,
        tracks: [
          {
            id: "t-1",
            playlistId: "p-1",
            name: "Track",
            artist: "A",
            artists: [{ name: "A" }],
            album: "B",
            durationMs: 120000,
            status: "completed",
          },
        ],
      },
      tracks: [
        {
          id: "t-1",
          playlistId: "p-1",
          name: "Track",
          artist: "A",
          artists: [{ name: "A" }],
          album: "B",
          durationMs: 120000,
          status: "completed",
        },
      ],
      coverUrl: undefined,
      playlistType: "album",
      backToArtistPath: "/library/artist/A",
    });

    render(
      <MemoryRouter>
        <LibraryAlbumDetail />
      </MemoryRouter>,
    );

    expect(screen.queryByRole("link", { name: "library.album.backToArtist" })).toBeNull();
  });
});
