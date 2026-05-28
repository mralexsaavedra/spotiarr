import { renderHook } from "@testing-library/react";
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
});
