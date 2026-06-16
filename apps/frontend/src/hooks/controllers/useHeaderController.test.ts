import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockUseCreatePlaylistMutation = vi.fn();
const mockNormalizeSpotifyUrl = vi.fn();

let mockPathname = "/";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: mockPathname }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
  };
});

vi.mock("@/hooks/mutations/useCreatePlaylistMutation", () => ({
  useCreatePlaylistMutation: () => mockUseCreatePlaylistMutation(),
}));

vi.mock("@/hooks/useDebounce", () => ({
  useDebounce: (value: string) => value,
}));

vi.mock("@/utils/spotify", () => ({
  normalizeSpotifyUrl: (url: string) => mockNormalizeSpotifyUrl(url),
}));

const { useHeaderController } = await import("./useHeaderController");

describe("useHeaderController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = "/";
    mockNormalizeSpotifyUrl.mockReturnValue(null);
    mockUseCreatePlaylistMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isSuccess: false,
    });
  });

  it("isValidUrl is false when url is empty or not a Spotify URL", () => {
    const { result } = renderHook(() => useHeaderController());

    expect(result.current.isValidUrl).toBe(false);
  });

  it("isValidUrl is true when normalizeSpotifyUrl returns a non-null value", () => {
    mockNormalizeSpotifyUrl.mockReturnValue("https://open.spotify.com/album/abc");

    const { result } = renderHook(() => useHeaderController());

    act(() => {
      result.current.handleChangeUrl({
        target: { value: "https://open.spotify.com/album/abc" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.isValidUrl).toBe(true);
  });

  it("handleSubmit calls createPlaylist.mutate when isValidUrl is true", () => {
    const normalizedUrl = "https://open.spotify.com/album/abc";
    mockNormalizeSpotifyUrl.mockReturnValue(normalizedUrl);

    const { result } = renderHook(() => useHeaderController());

    act(() => {
      result.current.handleChangeUrl({
        target: { value: normalizedUrl },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleSubmit();
    });

    expect(mockMutate).toHaveBeenCalledWith({
      kind: "spotifyUrl",
      spotifyUrl: normalizedUrl,
    });
  });

  it("handleSubmit navigates to search when url is not a Spotify URL", () => {
    mockNormalizeSpotifyUrl.mockReturnValue(null);

    const { result } = renderHook(() => useHeaderController());

    act(() => {
      result.current.handleChangeUrl({
        target: { value: "some artist name" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleSubmit();
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining("/search?q="),
      expect.any(Object),
    );
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("handleChangeUrl updates url", () => {
    // On the search page the clearing effect does not fire for non-Spotify urls
    mockPathname = "/search";
    const { result } = renderHook(() => useHeaderController());

    act(() => {
      result.current.handleChangeUrl({
        target: { value: "new value" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.url).toBe("new value");
  });

  it("handleKeyUp calls handleSubmit on Enter key", () => {
    const normalizedUrl = "https://open.spotify.com/album/xyz";
    mockNormalizeSpotifyUrl.mockReturnValue(normalizedUrl);

    const { result } = renderHook(() => useHeaderController());

    act(() => {
      result.current.handleChangeUrl({
        target: { value: normalizedUrl },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    act(() => {
      result.current.handleKeyUp({
        key: "Enter",
      } as React.KeyboardEvent<HTMLInputElement>);
    });

    expect(mockMutate).toHaveBeenCalledWith({
      kind: "spotifyUrl",
      spotifyUrl: normalizedUrl,
    });
  });

  it("isPending comes from createPlaylist.isPending", () => {
    mockUseCreatePlaylistMutation.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
      isSuccess: false,
    });

    const { result } = renderHook(() => useHeaderController());

    expect(result.current.isPending).toBe(true);
  });
});
