import type { PlaylistPreviewTracksPage } from "@spotiarr/shared";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { playlistService } from "@/services/playlist.service";
import {
  PLAYLIST_PREVIEW_PAGE_SIZE,
  usePlaylistPreviewTracksInfiniteQuery,
} from "./usePlaylistPreviewTracksInfiniteQuery";

vi.mock("@/services/playlist.service", () => ({
  playlistService: {
    getPlaylistPreviewTracksPage: vi.fn(),
  },
}));

const URL = "https://open.spotify.com/playlist/abc";

const makePage = (
  overrides: Partial<PlaylistPreviewTracksPage> = {},
): PlaylistPreviewTracksPage => ({
  tracks: [{ name: "Track", artists: [{ name: "Artist" }], album: "Album", duration: 1000 }],
  total: 250,
  hasMore: true,
  nextOffset: 200,
  ...overrides,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("usePlaylistPreviewTracksInfiniteQuery", () => {
  it("does not fetch while disabled", async () => {
    const { result } = renderHook(() => usePlaylistPreviewTracksInfiniteQuery(URL, 100, false), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(playlistService.getPlaylistPreviewTracksPage).not.toHaveBeenCalled();
  });

  it("does not fetch when spotifyUrl is null even if enabled", async () => {
    const { result } = renderHook(() => usePlaylistPreviewTracksInfiniteQuery(null, 100, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(playlistService.getPlaylistPreviewTracksPage).not.toHaveBeenCalled();
  });

  it("fetches the first page from initialPageParam with the page size", async () => {
    vi.mocked(playlistService.getPlaylistPreviewTracksPage).mockResolvedValueOnce(makePage());

    const { result } = renderHook(() => usePlaylistPreviewTracksInfiniteQuery(URL, 100, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(playlistService.getPlaylistPreviewTracksPage).toHaveBeenCalledWith(
      URL,
      100,
      PLAYLIST_PREVIEW_PAGE_SIZE,
    );
    expect(result.current.data?.pages).toHaveLength(1);
    expect(result.current.hasNextPage).toBe(true);
  });

  it("derives hasNextPage=false when nextOffset is null", async () => {
    vi.mocked(playlistService.getPlaylistPreviewTracksPage).mockResolvedValueOnce(
      makePage({ hasMore: false, nextOffset: null }),
    );

    const { result } = renderHook(() => usePlaylistPreviewTracksInfiniteQuery(URL, 100, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(false);
  });

  it("accumulates pages and advances the offset on fetchNextPage", async () => {
    vi.mocked(playlistService.getPlaylistPreviewTracksPage)
      .mockResolvedValueOnce(makePage({ nextOffset: 200 }))
      .mockResolvedValueOnce(makePage({ hasMore: false, nextOffset: null }));

    const { result } = renderHook(() => usePlaylistPreviewTracksInfiniteQuery(URL, 100, true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    result.current.fetchNextPage();

    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(playlistService.getPlaylistPreviewTracksPage).toHaveBeenNthCalledWith(
      2,
      URL,
      200,
      PLAYLIST_PREVIEW_PAGE_SIZE,
    );
    expect(result.current.hasNextPage).toBe(false);
  });
});
