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
});
