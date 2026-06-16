import type { ArtistRelease } from "@spotiarr/shared";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Releases } from "./Releases";

const mockUseReleasesController = vi.fn();

vi.mock("@/hooks/controllers/useReleasesController", () => ({
  useReleasesController: () => mockUseReleasesController(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/atoms/Loading", () => ({
  Loading: () => <div data-testid="loading" />,
}));

vi.mock("@/components/molecules/ApiErrorState", () => ({
  ApiErrorState: ({ message }: { message: string }) => <div data-testid="api-error">{message}</div>,
}));

vi.mock("@/components/molecules/EmptyState", () => ({
  EmptyState: ({ title }: { title: string }) => <div data-testid="empty-state">{title}</div>,
}));

vi.mock("@/components/molecules/PageHeader", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock("@/components/organisms/ReleasesList", () => ({
  ReleasesList: ({ releases }: { releases: unknown[] }) => (
    <div data-testid="releases-list" data-count={releases.length} />
  ),
}));

const noop = vi.fn();

const baseController = {
  releases: undefined as ArtistRelease[] | undefined,
  isLoading: false,
  error: null as Error | null,
  handleReleaseClick: noop,
  handleArtistClick: noop,
};

const makeRelease = (id: string): ArtistRelease => ({
  artistId: id,
  artistName: "Artist",
  artistImageUrl: null,
  albumId: `album-${id}`,
  albumName: "Album",
  coverUrl: null,
});

describe("Releases", () => {
  it("renders the error state when error is set", () => {
    mockUseReleasesController.mockReturnValue({
      ...baseController,
      error: new Error("fetch failed"),
    });

    render(<Releases />);

    expect(screen.getByTestId("api-error")).toBeTruthy();
    expect(screen.queryByTestId("releases-list")).toBeNull();
    expect(screen.queryByTestId("loading")).toBeNull();
  });

  it("renders the loading spinner when isLoading is true", () => {
    mockUseReleasesController.mockReturnValue({
      ...baseController,
      isLoading: true,
      releases: undefined,
    });

    render(<Releases />);

    expect(screen.getByTestId("loading")).toBeTruthy();
    expect(screen.queryByTestId("releases-list")).toBeNull();
    expect(screen.queryByTestId("empty-state")).toBeNull();
  });

  it("renders the empty state when releases array is empty", () => {
    mockUseReleasesController.mockReturnValue({
      ...baseController,
      releases: [],
    });

    render(<Releases />);

    expect(screen.getByTestId("empty-state")).toBeTruthy();
    expect(screen.queryByTestId("releases-list")).toBeNull();
    expect(screen.queryByTestId("loading")).toBeNull();
  });

  it("renders the releases list when releases are available", () => {
    mockUseReleasesController.mockReturnValue({
      ...baseController,
      releases: [makeRelease("1"), makeRelease("2")],
    });

    render(<Releases />);

    const list = screen.getByTestId("releases-list");
    expect(list).toBeTruthy();
    expect(list.getAttribute("data-count")).toBe("2");
    expect(screen.queryByTestId("empty-state")).toBeNull();
    expect(screen.queryByTestId("loading")).toBeNull();
  });

  it("renders the page title from translation key", () => {
    mockUseReleasesController.mockReturnValue({
      ...baseController,
      releases: [],
    });

    render(<Releases />);

    expect(screen.getByText("releases.title")).toBeTruthy();
  });
});
