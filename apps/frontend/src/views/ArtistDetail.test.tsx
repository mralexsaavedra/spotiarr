import type { ArtistRelease } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ArtistDetail } from "./ArtistDetail";

const mockUseArtistDetailController = vi.fn();

vi.mock("@/hooks/controllers/useArtistDetailController", () => ({
  useArtistDetailController: () => mockUseArtistDetailController(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("@/components/molecules/SpotifyLinkButton", () => ({
  SpotifyLinkButton: () => null,
}));

vi.mock("@/components/organisms/ArtistDiscography", () => ({
  ArtistDiscography: () => <div data-testid="artist-discography" />,
}));

vi.mock("@/components/molecules/ArtistHeader", () => ({
  ArtistHeader: () => <div data-testid="artist-header" />,
}));

vi.mock("@/components/atoms/Loading", () => ({
  Loading: () => <div data-testid="loading" />,
}));

vi.mock("@/components/molecules/ApiErrorState", () => ({
  ApiErrorState: () => <div data-testid="api-error" />,
}));

vi.mock("@fortawesome/react-fontawesome", () => ({
  FontAwesomeIcon: () => null,
}));

vi.mock("@/components/atoms/Button", () => ({
  Button: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

const makeAlbum = (albumId: string): ArtistRelease => ({
  artistId: "artist-1",
  artistName: "Test Artist",
  artistImageUrl: null,
  albumId,
  albumName: "Album",
  releaseDate: "2024-01-01",
  totalTracks: 10,
  coverUrl: null,
  spotifyUrl: undefined,
  albumType: "album",
});

const makeArtist = () => ({
  id: "artist-1",
  name: "Test Artist",
  image: null,
  spotifyUrl: null,
  followers: null,
  genres: [],
  albums: [makeAlbum("album-1")],
  isFollowed: false,
  catalogRefreshPending: false,
});

const defaultController = {
  id: "artist-1",
  artist: makeArtist(),
  isLoading: false,
  error: null,
  hasArtist: true,
  isArtistDownloaded: false,
  isFollowed: false,
  catalogRefreshPending: false,
  filter: "",
  setFilter: vi.fn(),
  filteredAlbums: [makeAlbum("album-1")],
  visibleItems: 10,
  isLoadingMore: false,
  handleShowMore: vi.fn(),
  canShowMore: false,
  handleArtistDownload: vi.fn(),
  handleNavigate: vi.fn(),
  handleArtistClick: vi.fn(),
};

describe("ArtistDetail", () => {
  it("shows Loading when isLoading is true", () => {
    mockUseArtistDetailController.mockReturnValue({
      ...defaultController,
      isLoading: true,
    });

    render(<ArtistDetail />);

    expect(screen.getByTestId("loading")).toBeTruthy();
    expect(screen.queryByTestId("artist-header")).toBeNull();
  });

  it("shows error state when error is set", () => {
    mockUseArtistDetailController.mockReturnValue({
      ...defaultController,
      error: new Error("Failed to load artist"),
    });

    render(<ArtistDetail />);

    expect(screen.getByTestId("api-error")).toBeTruthy();
    expect(screen.queryByTestId("artist-header")).toBeNull();
  });

  it("shows not-found paragraph when hasArtist is false", () => {
    mockUseArtistDetailController.mockReturnValue({
      ...defaultController,
      hasArtist: false,
      artist: undefined,
    });

    render(<ArtistDetail />);

    expect(screen.getByText("artist.notFound")).toBeTruthy();
    expect(screen.queryByTestId("artist-header")).toBeNull();
  });

  it("renders artist header and discography in happy path", () => {
    mockUseArtistDetailController.mockReturnValue(defaultController);

    render(<ArtistDetail />);

    expect(screen.getByTestId("artist-header")).toBeTruthy();
    expect(screen.getByTestId("artist-discography")).toBeTruthy();
  });
});
