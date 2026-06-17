import { act, renderHook } from "@testing-library/react";
import { generatePath } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Path } from "@/routes/routes";
import { useLibraryArtistController } from "./useLibraryArtistController";

const mockUseParams = vi.fn();
const mockUseNavigate = vi.fn();
const mockUseLibraryArtistQuery = vi.fn();

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  return {
    ...actual,
    useParams: () => mockUseParams(),
    useNavigate: () => mockUseNavigate,
  };
});

vi.mock("@/hooks/queries/useLibraryArtistQuery", () => ({
  useLibraryArtistQuery: (name: string) => mockUseLibraryArtistQuery(name),
}));

const makeAlbum = (name: string, year?: number) => ({
  name,
  path: `/library/artist/${name}`,
  artist: "Test Artist",
  trackCount: 10,
  totalSize: 1000,
  year: year ?? 2020,
  tracks: [],
});

const setupHook = (
  albums = [makeAlbum("Discovery", 2001), makeAlbum("Random Access Memories", 2013)],
) => {
  mockUseParams.mockReturnValue({ name: "Daft Punk" });
  mockUseLibraryArtistQuery.mockReturnValue({
    data: { name: "Daft Punk", albums },
    isLoading: false,
    error: null,
  });
  return renderHook(() => useLibraryArtistController());
};

describe("useLibraryArtistController", () => {
  it("builds album detail link with raw params and router encodes once", () => {
    const artistName = "Café del Mar / 100% Hits";
    const albumName = "Niñez / Éxitos 100%";

    mockUseParams.mockReturnValue({ name: artistName });
    mockUseLibraryArtistQuery.mockReturnValue({
      data: {
        name: artistName,
        albums: [],
      },
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useLibraryArtistController());

    result.current.handleAlbumClick(albumName);

    expect(mockUseNavigate).toHaveBeenCalledWith(
      generatePath(Path.LIBRARY_ALBUM, {
        name: artistName,
        albumName,
      }),
    );

    const calledPath = mockUseNavigate.mock.calls[0]?.[0] as string;
    expect(calledPath).toContain("Caf%C3%A9%20del%20Mar%20%2F%20100%25%20Hits");
    expect(calledPath).toContain("Ni%C3%B1ez%20%2F%20%C3%89xitos%20100%25");
    expect(calledPath).not.toContain("%2525");
  });

  describe("album search / filter", () => {
    it("exposes albumSearch as empty string initially", () => {
      const { result } = setupHook();

      expect(result.current.albumSearch).toBe("");
    });

    it("returns all albums when search term is empty", () => {
      const { result } = setupHook();

      expect(result.current.artist?.albums).toHaveLength(2);
    });

    it("filters albums by exact name match (case-insensitive)", () => {
      const { result } = setupHook();

      act(() => {
        result.current.onAlbumSearchChange("discovery");
      });

      expect(result.current.artist?.albums).toHaveLength(1);
      expect(result.current.artist?.albums[0]?.name).toBe("Discovery");
    });

    it("filters albums by partial substring match", () => {
      const { result } = setupHook();

      act(() => {
        result.current.onAlbumSearchChange("access");
      });

      expect(result.current.artist?.albums).toHaveLength(1);
      expect(result.current.artist?.albums[0]?.name).toBe("Random Access Memories");
    });

    it("filters are case-insensitive", () => {
      const { result } = setupHook();

      act(() => {
        result.current.onAlbumSearchChange("DISCOVERY");
      });

      expect(result.current.artist?.albums).toHaveLength(1);
      expect(result.current.artist?.albums[0]?.name).toBe("Discovery");
    });

    it("trims whitespace from search term before matching", () => {
      const { result } = setupHook();

      act(() => {
        result.current.onAlbumSearchChange("  discovery  ");
      });

      expect(result.current.artist?.albums).toHaveLength(1);
      expect(result.current.artist?.albums[0]?.name).toBe("Discovery");
    });

    it("returns empty array and sets noAlbumResults flag when no albums match", () => {
      const { result } = setupHook();

      act(() => {
        result.current.onAlbumSearchChange("nonexistent");
      });

      expect(result.current.artist?.albums).toHaveLength(0);
      expect(result.current.noAlbumResults).toBe(true);
    });

    it("noAlbumResults is false when there are matching albums", () => {
      const { result } = setupHook();

      act(() => {
        result.current.onAlbumSearchChange("discovery");
      });

      expect(result.current.noAlbumResults).toBe(false);
    });

    it("noAlbumResults is false when search is empty and artist has no albums", () => {
      const { result } = setupHook([]);

      expect(result.current.noAlbumResults).toBe(false);
    });

    it("still sorts filtered results by year descending", () => {
      const albums = [
        makeAlbum("Homework", 1997),
        makeAlbum("Discovery", 2001),
        makeAlbum("Human After All", 2005),
      ];
      const { result } = setupHook(albums);

      act(() => {
        result.current.onAlbumSearchChange("o");
      });

      const names = result.current.artist?.albums.map((a) => a.name);
      expect(names).toEqual(["Discovery", "Homework"]);
    });

    it("clearing the search restores all albums", () => {
      const { result } = setupHook();

      act(() => {
        result.current.onAlbumSearchChange("discovery");
      });

      expect(result.current.artist?.albums).toHaveLength(1);

      act(() => {
        result.current.onAlbumSearchChange("");
      });

      expect(result.current.artist?.albums).toHaveLength(2);
    });
  });
});
