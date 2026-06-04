/**
 * useSearchController dispatch coverage — PR-4.1
 *
 * TST-1: handleDownloadTrack dispatch cases
 * TST-2: handleDownloadAlbum dispatch cases
 *
 * NOTE ON TST-1a:
 * As of PR-4.1, a Deezer track URL + albumId dispatches `kind: "album"` (the D4
 * workaround introduced in Phase 3). PR-4.4 will change this to `kind: "deezerTrack"`.
 * The assertion below reflects the CURRENT behavior and acts as a regression guard:
 * once PR-4.4 lands and updates `handleDownloadTrack`, TST-1a must be updated to
 * assert `{ kind: "deezerTrack", deezerTrackId: "12345", deezerAlbumId: "456" }`.
 *
 * Closes: Phase 3 RISK-9 (Deezer track dispatch untested), RISK-10 (handleDownloadAlbum
 * Deezer branch untested).
 */
import { NormalizedTrack } from "@spotiarr/shared";
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchController } from "./useSearchController";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
const mockMutate = vi.fn();
const mockToast = {
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
};

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams("q=test"), vi.fn()],
  };
});

vi.mock("@/contexts/ToastContext", () => ({
  useToast: () => mockToast,
}));

vi.mock("@/hooks/mutations/useCreatePlaylistMutation", () => ({
  useCreatePlaylistMutation: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/queries/useSearchQuery", () => ({
  useSearchQuery: () => ({
    data: { tracks: [], albums: [], artists: [] },
    isLoading: false,
  }),
}));

vi.mock("@/contexts/DownloadStatusContext", () => ({
  useBulkPlaylistStatus: () => new Map(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deezerTrack(overrides?: Partial<NormalizedTrack>): NormalizedTrack {
  return {
    id: "deezer-track-1",
    name: "Karma Police",
    trackUrl: "https://api.deezer.com/track/12345",
    albumId: "456",
    primaryArtist: "artist-1",
    artists: [],
    spotifyUrl: null,
    ...overrides,
  } as NormalizedTrack;
}

function spotifyTrack(overrides?: Partial<NormalizedTrack>): NormalizedTrack {
  return {
    id: "spotify-track-1",
    name: "Creep",
    trackUrl: "https://open.spotify.com/track/abc",
    albumId: undefined,
    primaryArtist: "artist-2",
    artists: [],
    spotifyUrl: "https://open.spotify.com/track/abc",
    ...overrides,
  } as NormalizedTrack;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useSearchController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // TST-1: handleDownloadTrack
  // -------------------------------------------------------------------------

  describe("handleDownloadTrack", () => {
    /**
     * TST-1a — Deezer track URL + albumId present.
     *
     * PR-4.4: D4 workaround removed. Now dispatches `kind: "deezerTrack"` with
     * the extracted deezerTrackId and the albumId as deezerAlbumId.
     */
    it("TST-1a: Deezer URL + albumId → dispatches kind:deezerTrack with deezerTrackId+deezerAlbumId", () => {
      const { result } = renderHook(() => useSearchController());

      act(() => {
        result.current.handleDownloadTrack(deezerTrack());
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith({
        kind: "deezerTrack",
        deezerTrackId: "12345",
        deezerAlbumId: "456",
      });
      expect(mockToast.error).not.toHaveBeenCalled();
    });

    /**
     * TST-1b — No trackUrl AND no albumId → error toast, mutation NOT called.
     */
    it("TST-1b: no trackUrl and no albumId → error toast fired, mutation not called", () => {
      const { result } = renderHook(() => useSearchController());

      act(() => {
        result.current.handleDownloadTrack(
          deezerTrack({ trackUrl: undefined, albumId: undefined }),
        );
      });

      expect(mockMutate).not.toHaveBeenCalled();
      expect(mockToast.error).toHaveBeenCalledTimes(1);
    });

    /**
     * TST-1c — Spotify URL present → dispatches kind:spotifyUrl (regression guard).
     */
    it("TST-1c: Spotify URL → dispatches kind:spotifyUrl", () => {
      const { result } = renderHook(() => useSearchController());

      act(() => {
        result.current.handleDownloadTrack(spotifyTrack());
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith({
        kind: "spotifyUrl",
        spotifyUrl: "https://open.spotify.com/track/abc",
      });
      expect(mockToast.error).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // TST-2: handleDownloadAlbum
  // -------------------------------------------------------------------------

  describe("handleDownloadAlbum", () => {
    /**
     * TST-2a — Deezer album: spotifyUrl absent, artistId + albumId present.
     * Confirms handleDownloadAlbum does NOT silently ignore Deezer albums.
     */
    it("TST-2a: Deezer album (no spotifyUrl) → dispatches kind:album with artistId+albumId", () => {
      const { result } = renderHook(() => useSearchController());

      act(() => {
        result.current.handleDownloadAlbum({
          spotifyUrl: undefined,
          artistId: "111",
          albumId: "222",
        });
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith({
        kind: "album",
        artistId: "111",
        albumId: "222",
      });
    });

    /**
     * TST-2b — Spotify album: spotifyUrl present → dispatches kind:spotifyUrl.
     */
    it("TST-2b: Spotify album (spotifyUrl present) → dispatches kind:spotifyUrl", () => {
      const { result } = renderHook(() => useSearchController());

      act(() => {
        result.current.handleDownloadAlbum({
          spotifyUrl: "https://open.spotify.com/album/xyz",
          artistId: "333",
          albumId: "444",
        });
      });

      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith({
        kind: "spotifyUrl",
        spotifyUrl: "https://open.spotify.com/album/xyz",
      });
    });
  });
});
