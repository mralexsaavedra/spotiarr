import type { FollowedArtist } from "@spotiarr/shared";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Artists } from "./Artists";

const mockUseArtistsController = vi.fn();

vi.mock("@/hooks/controllers/useArtistsController", () => ({
  useArtistsController: () => mockUseArtistsController(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("@/components/atoms/Loading", () => ({
  Loading: () => <div data-testid="loading" />,
}));

vi.mock("@/components/molecules/ApiErrorState", () => ({
  ApiErrorState: () => <div data-testid="api-error" />,
}));

vi.mock("@/components/organisms/ArtistList", () => ({
  ArtistList: ({ artists }: { artists: unknown[] }) => (
    <div data-testid="artist-list" data-count={artists.length} />
  ),
}));

vi.mock("@/components/molecules/PageHeader", () => ({
  PageHeader: () => null,
}));

vi.mock("@/components/molecules/SearchInput", () => ({
  SearchInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <input data-testid="search-input" value={value} onChange={(e) => onChange(e.target.value)} />
  ),
}));

const makeArtist = (id: string): FollowedArtist => ({
  id,
  name: `Artist ${id}`,
  image: null,
  spotifyUrl: null,
});

const defaultController = {
  filteredArtists: [],
  isLoading: false,
  error: null,
  search: "",
  handleSearchChange: vi.fn(),
  handleArtistClick: vi.fn(),
};

describe("Artists", () => {
  it("shows error state when error is set", () => {
    mockUseArtistsController.mockReturnValue({
      ...defaultController,
      error: new Error("Network error"),
    });

    render(<Artists />);

    expect(screen.getByTestId("api-error")).toBeTruthy();
    expect(screen.queryByTestId("artist-list")).toBeNull();
  });

  it("shows Loading when isLoading is true", () => {
    mockUseArtistsController.mockReturnValue({
      ...defaultController,
      isLoading: true,
    });

    render(<Artists />);

    expect(screen.getByTestId("loading")).toBeTruthy();
    expect(screen.queryByTestId("artist-list")).toBeNull();
  });

  it("shows empty state text when no artists", () => {
    mockUseArtistsController.mockReturnValue({
      ...defaultController,
      filteredArtists: [],
    });

    render(<Artists />);

    expect(screen.getByText("artists.empty")).toBeTruthy();
    expect(screen.queryByTestId("artist-list")).toBeNull();
  });

  it("renders ArtistList when artists are present", () => {
    const artists = [makeArtist("1"), makeArtist("2")];
    mockUseArtistsController.mockReturnValue({
      ...defaultController,
      filteredArtists: artists,
    });

    render(<Artists />);

    const list = screen.getByTestId("artist-list");
    expect(list).toBeTruthy();
    expect(list.getAttribute("data-count")).toBe("2");
  });

  it("calls handleSearchChange when typing in search", () => {
    const handleSearchChange = vi.fn();
    mockUseArtistsController.mockReturnValue({
      ...defaultController,
      handleSearchChange,
    });

    render(<Artists />);

    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "rock" } });
    expect(handleSearchChange).toHaveBeenCalledWith("rock");
  });
});
