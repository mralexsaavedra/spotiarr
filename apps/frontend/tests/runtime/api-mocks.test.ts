import type { Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import {
  buildLibraryAlbum,
  buildHistoryItem,
  buildLibraryArtist,
  buildLibraryTrack,
  buildPlaylist,
  buildTrack,
  buildRelease,
  installArtistMocks,
  installExternalUrlMock,
  installFeedMocks,
  installHistoryMocks,
  installLibraryAudioMocks,
  installLibraryMocks,
  installPlaylistMocks,
  installTrackMocks,
} from "../helpers/api-mocks";

type RoutePattern = string | RegExp;

interface MockRoute {
  abort(reason?: string): Promise<void>;
  fulfill(payload: {
    status: number;
    contentType: string;
    body: string;
    headers?: Record<string, string>;
  }): Promise<void>;
  request(): {
    method(): string;
    url(): string;
  };
}

type RouteHandler = (route: MockRoute) => Promise<void>;

interface RegisteredRoute {
  handler: RouteHandler;
  pattern: RoutePattern;
}

const TESTS_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function createRouteRecorder() {
  const routes: RegisteredRoute[] = [];
  const initScripts: unknown[] = [];

  const page = {
    route: async (pattern: RoutePattern, handler: RouteHandler) => {
      routes.push({ pattern, handler });
    },
    addInitScript: async (script: unknown) => {
      initScripts.push(script);
    },
  } as unknown as Page;

  return { page, routes, initScripts };
}

async function invokeJsonRoute(handler: RouteHandler, url: string) {
  let fulfilledBody: string | null = null;

  await handler({
    abort: async () => {
      throw new Error("Route should not abort");
    },
    fulfill: async ({ body }) => {
      fulfilledBody = body;
    },
    request: () => ({
      method: () => "GET",
      url: () => url,
    }),
  });

  expect(fulfilledBody).not.toBeNull();

  return JSON.parse(fulfilledBody!);
}

describe("api mock builders", () => {
  test("build typed route DTOs with minimal defaults", () => {
    const artist = buildLibraryArtist();
    const playlist = buildPlaylist();
    const historyItem = buildHistoryItem();
    const release = buildRelease();

    expect(artist).toMatchObject({
      albumCount: 1,
      albums: [
        {
          artist: "Library Artist",
          name: "Library Album",
          trackCount: 1,
        },
      ],
      name: "Library Artist",
      path: "/library/artists/library-artist",
      trackCount: 1,
    });
    expect(playlist).toMatchObject({
      id: "playlist-1",
      name: "Mock Playlist",
      subscribed: false,
      spotifyUrl: "https://open.spotify.com/playlist/playlist-1",
    });
    expect(historyItem).toMatchObject({
      lastCompletedAt: 1_700_000_000_000,
      playlistName: "History Playlist",
      trackCount: 12,
    });
    expect(release).toMatchObject({
      albumId: "release-album-1",
      albumName: "Release Album",
      artistId: "release-artist-1",
      artistName: "Release Artist",
    });
  });

  test("allows overriding nested DTO data without adding extra fields", () => {
    const artist = buildLibraryArtist({
      albums: [],
      name: "Boards of Canada",
      trackCount: 0,
    });
    const playlist = buildPlaylist({ id: "playlist-42", tracks: [] });
    const historyItem = buildHistoryItem({ playlistSpotifyUrl: null, trackCount: 0 });
    const release = buildRelease({ albumType: "single", totalTracks: 2 });

    expect(artist).toMatchObject({ albums: [], name: "Boards of Canada", trackCount: 0 });
    expect(playlist).toMatchObject({ id: "playlist-42", tracks: [] });
    expect(historyItem).toMatchObject({ playlistSpotifyUrl: null, trackCount: 0 });
    expect(release).toMatchObject({ albumType: "single", totalTracks: 2 });
  });

  test("builds reusable library album, library track, and managed track defaults", () => {
    const libraryTrack = buildLibraryTrack();
    const libraryAlbum = buildLibraryAlbum();
    const track = buildTrack();

    expect(libraryTrack).toMatchObject({
      album: "Library Album",
      artist: "Library Artist",
      filePath: "/library/artists/library-artist/library-album/01 Mock Track.mp3",
      format: "mp3",
      name: "Mock Track",
    });
    expect(libraryAlbum).toMatchObject({
      artist: "Library Artist",
      name: "Library Album",
      path: "/library/artists/library-artist/library-album",
      trackCount: 1,
    });
    expect(track).toMatchObject({
      artist: "Mock Artist",
      id: "track-1",
      name: "Mock Track",
      status: "completed",
    });
  });
});

describe("api mock installers", () => {
  test("installs library routes with wrapped stats and artist payloads", async () => {
    const { page, routes } = createRouteRecorder();
    const artist = buildLibraryArtist({ name: "Tycho" });

    await installLibraryMocks(page, {
      artists: [artist],
      artistDetail: artist,
    });

    expect(routes).toHaveLength(4);
    expect(routes.map((route) => String(route.pattern))).toEqual([
      "**/api/library/stats",
      "**/api/library/artists",
      "**/api/library/artists/**",
      "**/api/library/artwork-backfill/status",
    ]);

    await expect(
      invokeJsonRoute(routes[0]!.handler, "http://127.0.0.1:4173/api/library/stats"),
    ).resolves.toMatchObject({ data: { totalAlbums: 1, totalArtists: 1, totalTracks: 1 } });
    await expect(
      invokeJsonRoute(routes[2]!.handler, "http://127.0.0.1:4173/api/library/artists/Tycho"),
    ).resolves.toMatchObject({ data: artist });
  });

  test("waits for explicit gate release before fulfilling selected library routes", async () => {
    const { page, routes } = createRouteRecorder();
    const releaseGate = Promise.withResolvers<void>();

    await installLibraryMocks(page, {
      gates: {
        artists: releaseGate.promise,
        stats: releaseGate.promise,
      },
    });

    const statsResponse = invokeJsonRoute(
      routes[0]!.handler,
      "http://127.0.0.1:4173/api/library/stats",
    );

    const artistsResponse = invokeJsonRoute(
      routes[1]!.handler,
      "http://127.0.0.1:4173/api/library/artists",
    );

    await expect(
      Promise.race([
        statsResponse.then(() => "settled"),
        new Promise((resolve) => setTimeout(() => resolve("pending"), 10)),
      ]),
    ).resolves.toBe("pending");
    await expect(
      Promise.race([
        artistsResponse.then(() => "settled"),
        new Promise((resolve) => setTimeout(() => resolve("pending"), 10)),
      ]),
    ).resolves.toBe("pending");

    releaseGate.resolve();

    await expect(statsResponse).resolves.toMatchObject({
      data: { totalAlbums: 1, totalArtists: 1, totalTracks: 1 },
    });
    await expect(artistsResponse).resolves.toMatchObject({
      data: [expect.objectContaining({ name: "Library Artist" })],
    });
  });

  test("installs playlist and history routes with the exact response envelopes", async () => {
    const { page, routes } = createRouteRecorder();
    const playlist = buildPlaylist();
    const historyItem = buildHistoryItem();

    await installPlaylistMocks(page, { playlists: [playlist] });
    await installHistoryMocks(page, { downloads: [historyItem] });

    expect(routes.map((route) => String(route.pattern))).toEqual([
      "**/api/playlist",
      "**/api/playlist/me",
      "**/api/playlist/preview**",
      "**/api/playlist/preview/tracks**",
      "**/api/history/downloads",
      "**/api/history/tracks",
      "**/api/history/top-tracks**",
      "**/api/history/top-artists**",
      "**/api/history/recent-plays**",
    ]);

    await expect(
      invokeJsonRoute(routes[0]!.handler, "http://127.0.0.1:4173/api/playlist"),
    ).resolves.toMatchObject({ data: [playlist] });
    await expect(
      invokeJsonRoute(routes[4]!.handler, "http://127.0.0.1:4173/api/history/downloads"),
    ).resolves.toMatchObject({ data: [historyItem] });
  });

  test("installs feed, artist, and external-url routes for future mocked specs", async () => {
    const { page, routes } = createRouteRecorder();
    const release = buildRelease();

    await installFeedMocks(page, { followedArtists: [], releases: [release] });
    await installArtistMocks(page, {
      artistId: "artist-1",
      detail: {
        albums: [release],
        id: "artist-1",
        image: null,
        isFollowed: true,
        name: "Release Artist",
        spotifyUrl: "https://open.spotify.com/artist/artist-1",
      },
      tracks: [],
    });
    await installExternalUrlMock(page, {
      url: "https://open.spotify.com/artist/artist-1",
    });

    expect(routes.map((route) => String(route.pattern))).toEqual([
      "**/api/feed/releases",
      "**/api/feed/artists",
      "**/api/artist/artist-1**",
      "**/api/artist/artist-1/albums**",
      "**/api/artist/artist-1/albums/**/tracks",
      "**/api/external-url**",
    ]);

    await expect(
      invokeJsonRoute(routes[0]!.handler, "http://127.0.0.1:4173/api/feed/releases"),
    ).resolves.toEqual([release]);
    await expect(
      invokeJsonRoute(routes[5]!.handler, "http://127.0.0.1:4173/api/external-url?id=artist-1"),
    ).resolves.toEqual({ url: "https://open.spotify.com/artist/artist-1" });
  });

  test("installs track routes keyed by playlist id for detail views", async () => {
    const { page, routes } = createRouteRecorder();
    const track = buildTrack({ id: "detail-track-1", playlistId: "playlist-detail-1" });

    await installTrackMocks(page, {
      tracksByPlaylistId: {
        "playlist-detail-1": [track],
      },
    });

    expect(routes).toHaveLength(1);
    expect(String(routes[0]!.pattern)).toBe("**/api/track/playlist/**");

    await expect(
      invokeJsonRoute(
        routes[0]!.handler,
        "http://127.0.0.1:4173/api/track/playlist/playlist-detail-1",
      ),
    ).resolves.toMatchObject({ data: [track] });
    await expect(
      invokeJsonRoute(routes[0]!.handler, "http://127.0.0.1:4173/api/track/playlist/missing"),
    ).resolves.toMatchObject({ data: [] });
  });

  test("installs a hermetic library audio route for playback-capable specs", async () => {
    const { page, routes, initScripts } = createRouteRecorder();

    await installLibraryAudioMocks(page);

    expect(routes).toHaveLength(1);
    expect(String(routes[0]!.pattern)).toBe("**/api/library/audio**");
    expect(initScripts).toHaveLength(1);
  });
});

describe("e2e suite structure", () => {
  test("keeps search and not-found specs inside the active Playwright testDir", async () => {
    const mockedSearchSpec = path.join(TESTS_ROOT, "e2e/mocked/search.spec.ts");
    const mockedNotFoundSpec = path.join(TESTS_ROOT, "e2e/mocked/not-found.spec.ts");
    const legacySearchSpec = path.join(TESTS_ROOT, "search/search.spec.ts");
    const legacyNotFoundSpec = path.join(TESTS_ROOT, "not-found/not-found.spec.ts");

    const mockedSearchContents = await readFile(mockedSearchSpec, "utf8");
    const mockedNotFoundContents = await readFile(mockedNotFoundSpec, "utf8");

    expect(mockedSearchContents).toContain('"Search smoke"');
    expect(mockedNotFoundContents).toContain('"Not found smoke"');
    await expect(readFile(legacySearchSpec, "utf8")).rejects.toThrow();
    await expect(readFile(legacyNotFoundSpec, "utf8")).rejects.toThrow();
  });

  test("uses the shared mocked fixture for mocked search coverage", async () => {
    const mockedSearchSpec = path.join(TESTS_ROOT, "e2e/mocked/search.spec.ts");
    const mockedSearchContents = await readFile(mockedSearchSpec, "utf8");

    expect(mockedSearchContents).toContain('import { expect, test } from "../../fixtures/test";');
    expect(mockedSearchContents).not.toContain('from "@playwright/test"');
    expect(mockedSearchContents).not.toContain("rawTest");
    expect(mockedSearchContents).not.toContain("baseExpect");
  });
});
