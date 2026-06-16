import type { LibraryArtist as LibraryArtistType } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LibraryArtist } from "./LibraryArtist";

const mockUseLibraryArtistController = vi.fn();

vi.mock("@/hooks/controllers/useLibraryArtistController", () => ({
  useLibraryArtistController: () => mockUseLibraryArtistController(),
}));

vi.mock("@/components/atoms/Loading", () => ({
  Loading: () => <div data-testid="loading" />,
}));

vi.mock("@/components/molecules/EmptyState", () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

vi.mock("@/components/organisms/LibraryArtistProfile", () => ({
  LibraryArtistProfile: () => <div data-testid="library-artist-profile" />,
}));

vi.mock("@fortawesome/free-solid-svg-icons", () => ({
  faMusic: {},
}));

const makeArtist = (): LibraryArtistType => ({
  name: "Test Artist",
  path: "/music/test-artist",
  albumCount: 3,
  trackCount: 30,
  totalSize: 1024 * 1024 * 100,
  image: undefined,
  albums: [],
});

const defaultController = {
  t: (key: string, fallback?: string) => fallback ?? key,
  artist: makeArtist(),
  isLoading: false,
  error: null,
  handleAlbumClick: vi.fn(),
};

describe("LibraryArtist", () => {
  it("shows Loading when isLoading is true", () => {
    mockUseLibraryArtistController.mockReturnValue({
      ...defaultController,
      isLoading: true,
    });

    render(<LibraryArtist />);

    expect(screen.getByTestId("loading")).toBeTruthy();
    expect(screen.queryByTestId("library-artist-profile")).toBeNull();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });

  it("shows EmptyState when error is set", () => {
    mockUseLibraryArtistController.mockReturnValue({
      ...defaultController,
      error: new Error("Failed to load"),
    });

    render(<LibraryArtist />);

    expect(screen.getByTestId("empty-state")).toBeTruthy();
    expect(screen.queryByTestId("library-artist-profile")).toBeNull();
  });

  it("shows EmptyState when artist is undefined", () => {
    mockUseLibraryArtistController.mockReturnValue({
      ...defaultController,
      artist: undefined,
    });

    render(<LibraryArtist />);

    expect(screen.getByTestId("empty-state")).toBeTruthy();
    expect(screen.queryByTestId("library-artist-profile")).toBeNull();
  });

  it("renders LibraryArtistProfile when artist is available", () => {
    mockUseLibraryArtistController.mockReturnValue(defaultController);

    render(<LibraryArtist />);

    expect(screen.getByTestId("library-artist-profile")).toBeTruthy();
    expect(screen.queryByTestId("empty-state")).toBeNull();
    expect(screen.queryByTestId("loading")).toBeNull();
  });
});
