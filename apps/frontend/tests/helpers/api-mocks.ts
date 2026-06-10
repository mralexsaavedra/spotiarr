import { type Page } from "@playwright/test";
import {
  ApiRoutes,
  type ArtistDetail,
  type ArtistRelease,
  type ArtworkBackfillStatusResponse,
  type DownloadHistoryItem,
  type FollowedArtist,
  type LibraryAlbum,
  type LibraryArtist,
  type LibraryStats,
  type LibraryTrack,
  type PlaylistHistory,
  PlaylistStatusEnum,
  PlaylistTypeEnum,
  type SettingItem,
  type SettingMetadata,
  type SpotifySearchResults,
  TrackStatusEnum,
  UI_SUPPORTED_AUDIO_FORMATS,
  type SupportedAudioFormat,
} from "@spotiarr/shared";
import type { Playlist, Track } from "../../src/types";

export interface AppShellMockOptions {
  mockPlaylistStatus?: boolean;
  settings?: SettingItem[];
  settingsMetadata?: Record<string, SettingMetadata>;
  supportedFormats?: SupportedAudioFormat[];
  spotifyAuthStatus?: SpotifyAuthStatus;
}

export interface AppShellMockGuard {
  assertNoUnhandledRequests(timeoutMs?: number): Promise<void>;
  waitForUnhandledRequest(timeoutMs?: number): Promise<string>;
}

interface SpotifyAuthStatus {
  authenticated: boolean;
  hasRefreshToken: boolean;
}

interface MockSettingsPageDataOptions {
  settings?: SettingItem[];
  settingsMetadata?: Record<string, SettingMetadata>;
  supportedFormats?: SupportedAudioFormat[];
}

interface MockSearchResultsOptions {
  query: string;
  results: SpotifySearchResults;
  delayMs?: number;
  types?: string[];
}

interface MockLibraryOptions {
  stats?: LibraryStats;
  artists?: LibraryArtist[];
  artistDetail?: LibraryArtist;
  artworkBackfillStatus?: ArtworkBackfillStatusResponse;
  gates?: {
    stats?: Promise<void>;
    artists?: Promise<void>;
    artistDetail?: Promise<void>;
    artworkBackfillStatus?: Promise<void>;
  };
}

interface MockPlaylistOptions {
  playlists?: Playlist[];
  myPlaylists?: Array<{
    id: string;
    image: string | null;
    name: string;
    owner: string;
    ownerUrl?: string;
    spotifyUrl: string;
    tracks: number;
  }>;
  preview?: {
    coverUrl: string | null;
    description: string | null;
    name: string;
    owner?: string;
    ownerUrl?: string;
    totalTracks: number;
    tracks: Array<{
      album: string;
      artists: { name: string; url?: string }[];
      duration: number;
      name: string;
      albumUrl?: string;
      trackUrl?: string;
    }>;
    type: string;
  };
  previewTracksPage?: {
    hasMore: boolean;
    nextOffset: number | null;
    total: number;
    tracks: Array<{
      album: string;
      artists: { name: string; url?: string }[];
      duration: number;
      name: string;
      albumUrl?: string;
      trackUrl?: string;
    }>;
  };
}

interface MockHistoryOptions {
  downloads?: PlaylistHistory[];
  tracks?: DownloadHistoryItem[];
}

interface MockTrackOptions {
  tracksByPlaylistId?: Record<string, Track[]>;
}

interface MockFeedOptions {
  followedArtists?: FollowedArtist[];
  releases?: ArtistRelease[];
}

interface MockArtistOptions {
  artistId: string;
  detail: ArtistDetail;
  albums?: ArtistRelease[];
  tracks?: SpotifySearchResults["tracks"];
}

const DEFAULT_TIMESTAMP = new Date(0).toISOString();

const DEFAULT_COMPLETED_AT = 1_700_000_000_000;

const SILENT_WAV_BUFFER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x41, 0x56, 0x45, 0x66, 0x6d, 0x74, 0x20,
  0x10, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x44, 0xac, 0x00, 0x00, 0x88, 0x58, 0x01, 0x00,
  0x02, 0x00, 0x10, 0x00, 0x64, 0x61, 0x74, 0x61, 0x00, 0x00, 0x00, 0x00,
]);

const SETTINGS_PAYLOAD = {
  data: [
    { key: "UI_LANGUAGE", value: "en", updatedAt: DEFAULT_TIMESTAMP },
    { key: "FORMAT", value: "mp3", updatedAt: DEFAULT_TIMESTAMP },
  ],
};

const SETTINGS_METADATA_PAYLOAD: { data: Record<string, SettingMetadata> } = {
  data: {
    UI_LANGUAGE: {
      key: "UI_LANGUAGE",
      defaultValue: "en",
      type: "string",
      component: "select",
      section: "General",
      label: "Interface Language",
      description: "Select your preferred language for the interface.",
      options: ["en", "es"],
    },
    FORMAT: {
      key: "FORMAT",
      defaultValue: "mp3",
      type: "string",
      component: "select",
      section: "General",
      label: "Audio format",
      description: "The audio format for downloaded tracks.",
      options: [...UI_SUPPORTED_AUDIO_FORMATS],
    },
  },
};

const SUPPORTED_FORMATS_PAYLOAD = {
  data: [...UI_SUPPORTED_AUDIO_FORMATS],
};

const DOWNLOAD_STATUS_PAYLOAD = {
  playlistStatusMap: {} as Record<string, PlaylistStatusEnum>,
  trackStatusMap: {} as Record<string, TrackStatusEnum>,
  albumTrackCountMap: {} as Record<string, number>,
};

const SSE_PAYLOAD = ": connected\n\n";

const SPOTIFY_AUTH_STATUS_PAYLOAD: SpotifyAuthStatus = {
  authenticated: false,
  hasRefreshToken: false,
};

const ARTWORK_BACKFILL_STATUS_PAYLOAD: { data: ArtworkBackfillStatusResponse } = {
  data: {
    runId: null,
    status: "idle",
    phase: null,
    totals: 0,
    processed: 0,
    skippedExisting: 0,
    written: 0,
    failed: 0,
    externalCalls: 0,
    lastCheckpoint: null,
    rateLimitUntil: null,
    updatedAt: null,
  },
};

const LIBRARY_STATS_PAYLOAD: { data: LibraryStats } = {
  data: {
    totalArtists: 1,
    totalAlbums: 1,
    totalTracks: 1,
    totalSize: 4_096,
    lastScannedAt: null,
  },
};

const buildApiUrl = (pathname: string): string => `${ApiRoutes.BASE}${pathname}`;

const waitForDelay = async (delayMs = 0): Promise<void> => {
  if (delayMs <= 0) {
    return;
  }

  await new Promise((resolve) => setTimeout(resolve, delayMs));
};

const fulfillJson = async (
  route: Parameters<Page["route"]>[1] extends (route: infer T) => unknown ? T : never,
  body: unknown,
) => {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
};

const registerJsonRoute = async (
  page: Page,
  pathname: string,
  body: unknown,
  gate?: Promise<void>,
): Promise<void> => {
  await page.route(`**${buildApiUrl(pathname)}`, async (route) => {
    await gate;
    await fulfillJson(route, body);
  });
};

export function buildTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: "track-1",
    name: "Mock Track",
    artist: "Mock Artist",
    album: "Mock Album",
    status: TrackStatusEnum.Completed,
    spotifyUrl: "https://open.spotify.com/track/track-1",
    trackUrl: "https://open.spotify.com/track/track-1",
    durationMs: 180_000,
    ...overrides,
  };
}

export function buildLibraryTrack(overrides: Partial<LibraryTrack> = {}): LibraryTrack {
  return {
    fileName: "01 Mock Track.mp3",
    filePath: "/library/artists/library-artist/library-album/01 Mock Track.mp3",
    trackNumber: 1,
    discNumber: 1,
    name: "Mock Track",
    artist: "Library Artist",
    album: "Library Album",
    duration: 180,
    format: "mp3",
    size: 4_096,
    modifiedAt: DEFAULT_COMPLETED_AT,
    ...overrides,
  };
}

export function buildLibraryAlbum(overrides: Partial<LibraryAlbum> = {}): LibraryAlbum {
  const tracks = overrides.tracks ?? [buildLibraryTrack()];

  return {
    name: "Library Album",
    path: "/library/artists/library-artist/library-album",
    artist: "Library Artist",
    trackCount: tracks.length,
    totalSize: tracks.reduce((total, track) => total + track.size, 0),
    year: 2001,
    image: "/artwork/library-album.jpg",
    tracks,
    ...overrides,
  };
}

export function buildLibraryArtist(overrides: Partial<LibraryArtist> = {}): LibraryArtist {
  const albums = overrides.albums ?? [buildLibraryAlbum()];

  return {
    name: "Library Artist",
    path: "/library/artists/library-artist",
    albumCount: albums.length,
    trackCount: albums.reduce((total, album) => total + album.trackCount, 0),
    totalSize: albums.reduce((total, album) => total + album.totalSize, 0),
    image: "/artwork/library-artist.jpg",
    albums,
    ...overrides,
  };
}

export function buildPlaylist(overrides: Partial<Playlist> = {}): Playlist {
  return {
    id: "playlist-1",
    name: "Mock Playlist",
    type: PlaylistTypeEnum.Playlist,
    spotifyUrl: "https://open.spotify.com/playlist/playlist-1",
    subscribed: false,
    owner: "Spotiarr",
    ownerUrl: "https://open.spotify.com/user/spotiarr",
    coverUrl: "/artwork/mock-playlist.jpg",
    description: "Mock playlist used for route coverage.",
    tracks: [buildTrack({ playlistId: "playlist-1" })],
    ...overrides,
  };
}

export function buildHistoryItem(overrides: Partial<PlaylistHistory> = {}): PlaylistHistory {
  return {
    playlistId: "playlist-1",
    playlistName: "History Playlist",
    playlistSpotifyUrl: "https://open.spotify.com/playlist/playlist-1",
    trackCount: 12,
    lastCompletedAt: DEFAULT_COMPLETED_AT,
    ...overrides,
  };
}

function buildDownloadHistoryTrack(
  overrides: Partial<DownloadHistoryItem> = {},
): DownloadHistoryItem {
  return {
    id: "download-history-1",
    playlistId: "playlist-1",
    playlistName: "History Playlist",
    playlistSpotifyUrl: "https://open.spotify.com/playlist/playlist-1",
    trackId: "track-1",
    trackName: "Mock Track",
    artist: "Mock Artist",
    album: "Mock Album",
    trackUrl: "https://open.spotify.com/track/track-1",
    completedAt: DEFAULT_COMPLETED_AT,
    ...overrides,
  };
}

export function buildRelease(overrides: Partial<ArtistRelease> = {}): ArtistRelease {
  return {
    artistId: "release-artist-1",
    artistName: "Release Artist",
    artistImageUrl: null,
    albumId: "release-album-1",
    albumName: "Release Album",
    albumType: "album",
    releaseDate: "2024-01-01",
    coverUrl: null,
    spotifyUrl: "https://open.spotify.com/album/release-album-1",
    totalTracks: 10,
    ...overrides,
  };
}

export async function mockSettingsPageData(
  page: Page,
  {
    settings = SETTINGS_PAYLOAD.data,
    settingsMetadata = SETTINGS_METADATA_PAYLOAD.data,
    supportedFormats = SUPPORTED_FORMATS_PAYLOAD.data,
  }: MockSettingsPageDataOptions = {},
): Promise<void> {
  await page.route(`**${buildApiUrl(ApiRoutes.SETTINGS)}`, async (route) => {
    await fulfillJson(route, { data: settings });
  });

  await page.route(`**${buildApiUrl(`${ApiRoutes.SETTINGS}/metadata`)}`, async (route) => {
    await fulfillJson(route, { data: settingsMetadata });
  });

  await page.route(`**${buildApiUrl(`${ApiRoutes.SETTINGS}/formats`)}`, async (route) => {
    await fulfillJson(route, { data: supportedFormats });
  });
}

export async function mockSpotifyAuthStatus(
  page: Page,
  status: SpotifyAuthStatus = SPOTIFY_AUTH_STATUS_PAYLOAD,
): Promise<void> {
  await page.route(`**${buildApiUrl(`${ApiRoutes.AUTH}/spotify/status`)}`, async (route) => {
    await fulfillJson(route, status);
  });
}

export async function mockSearchResults(
  page: Page,
  { query, results, delayMs = 0, types }: MockSearchResultsOptions,
): Promise<void> {
  await page.route(`**${buildApiUrl(ApiRoutes.SEARCH)}**`, async (route) => {
    const url = new URL(route.request().url());

    if (url.searchParams.get("q") !== query) {
      throw new Error(`Unexpected mocked search query: ${url.searchParams.get("q")}`);
    }

    if (types) {
      const requestedTypes = url.searchParams.get("types")?.split(",") ?? [];

      if (requestedTypes.join(",") !== types.join(",")) {
        throw new Error(`Unexpected mocked search types: ${requestedTypes.join(",")}`);
      }
    }

    await waitForDelay(delayMs);
    await fulfillJson(route, { data: results });
  });
}

export async function installLibraryMocks(
  page: Page,
  {
    stats = LIBRARY_STATS_PAYLOAD.data,
    artists = [buildLibraryArtist()],
    artistDetail = artists[0] ?? buildLibraryArtist(),
    artworkBackfillStatus = ARTWORK_BACKFILL_STATUS_PAYLOAD.data,
    gates = {},
  }: MockLibraryOptions = {},
): Promise<void> {
  await registerJsonRoute(page, `${ApiRoutes.LIBRARY}/stats`, { data: stats }, gates.stats);
  await registerJsonRoute(page, `${ApiRoutes.LIBRARY}/artists`, { data: artists }, gates.artists);
  await registerJsonRoute(
    page,
    `${ApiRoutes.LIBRARY}/artists/**`,
    { data: artistDetail },
    gates.artistDetail,
  );
  await registerJsonRoute(
    page,
    `${ApiRoutes.LIBRARY}/artwork-backfill/status`,
    {
      data: artworkBackfillStatus,
    },
    gates.artworkBackfillStatus,
  );
}

export async function installPlaylistMocks(
  page: Page,
  {
    playlists = [buildPlaylist()],
    myPlaylists = [],
    preview = {
      name: "Preview Playlist",
      type: "playlist",
      description: null,
      coverUrl: null,
      totalTracks: 1,
      tracks: [
        {
          name: "Preview Track",
          artists: [
            { name: "Preview Artist", url: "https://open.spotify.com/artist/preview-artist" },
          ],
          album: "Preview Album",
          duration: 180_000,
          trackUrl: "https://open.spotify.com/track/preview-track",
          albumUrl: "https://open.spotify.com/album/preview-album",
        },
      ],
    },
    previewTracksPage = {
      tracks: preview.tracks,
      total: preview.totalTracks,
      hasMore: false,
      nextOffset: null,
    },
  }: MockPlaylistOptions = {},
): Promise<void> {
  await registerJsonRoute(page, ApiRoutes.PLAYLIST, { data: playlists });
  await registerJsonRoute(page, `${ApiRoutes.PLAYLIST}/me`, myPlaylists);
  await registerJsonRoute(page, `${ApiRoutes.PLAYLIST}/preview**`, preview);
  await registerJsonRoute(page, `${ApiRoutes.PLAYLIST}/preview/tracks**`, previewTracksPage);
}

export async function installHistoryMocks(
  page: Page,
  {
    downloads = [buildHistoryItem()],
    tracks = [buildDownloadHistoryTrack()],
  }: MockHistoryOptions = {},
): Promise<void> {
  await registerJsonRoute(page, `${ApiRoutes.HISTORY}/downloads`, { data: downloads });
  await registerJsonRoute(page, `${ApiRoutes.HISTORY}/tracks`, { data: tracks });
}

export async function installTrackMocks(
  page: Page,
  { tracksByPlaylistId = {} }: MockTrackOptions = {},
): Promise<void> {
  await page.route(`**${buildApiUrl(`${ApiRoutes.TRACK}/playlist/**`)}`, async (route) => {
    const url = new URL(route.request().url());
    const playlistId = url.pathname.split("/").pop() ?? "";

    await fulfillJson(route, { data: tracksByPlaylistId[playlistId] ?? [] });
  });
}

export async function installLibraryAudioMocks(page: Page): Promise<void> {
  await page.route(`**${buildApiUrl(`${ApiRoutes.LIBRARY}/audio**`)}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "audio/wav",
      body: SILENT_WAV_BUFFER,
    });
  });
}

export async function installFeedMocks(
  page: Page,
  { followedArtists = [], releases = [buildRelease()] }: MockFeedOptions = {},
): Promise<void> {
  await registerJsonRoute(page, `${ApiRoutes.FEED}/releases`, releases);
  await registerJsonRoute(page, `${ApiRoutes.FEED}/artists`, followedArtists);
}

export async function installArtistMocks(
  page: Page,
  { artistId, detail, albums = detail.albums, tracks = [] }: MockArtistOptions,
): Promise<void> {
  await registerJsonRoute(page, `${ApiRoutes.ARTIST}/${artistId}**`, detail);
  await registerJsonRoute(page, `${ApiRoutes.ARTIST}/${artistId}/albums**`, albums);
  await registerJsonRoute(page, `${ApiRoutes.ARTIST}/${artistId}/albums/**/tracks`, tracks);
}

export async function mockAuthSession(
  page: Page,
  { tokenRequired }: { tokenRequired: boolean },
): Promise<void> {
  await page.route(`**${buildApiUrl(ApiRoutes.AUTH_SESSION)}`, async (route) => {
    await fulfillJson(route, { tokenRequired });
  });
}

export async function mockAuthSessionUnauthorized(page: Page): Promise<void> {
  await page.route(`**${buildApiUrl(ApiRoutes.AUTH_SESSION)}`, async (route) => {
    await route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
  });
}

export async function mockAuthSessionError(page: Page, status = 500): Promise<void> {
  await page.route(`**${buildApiUrl(ApiRoutes.AUTH_SESSION)}`, async (route) => {
    await route.fulfill({ status, contentType: "application/json", body: "{}" });
  });
}

export async function mockAuthUnlock(
  page: Page,
  { status = 200 }: { status?: number } = {},
): Promise<void> {
  await page.route(`**${buildApiUrl(ApiRoutes.AUTH_UNLOCK)}`, async (route) => {
    if (status === 200) {
      await fulfillJson(route, { ok: true });
    } else {
      await route.fulfill({ status, contentType: "application/json", body: "{}" });
    }
  });
}

export async function mockLockedThenUnlock(page: Page): Promise<{ resolve: () => void }> {
  let unlocked = false;

  await page.route(`**${buildApiUrl(ApiRoutes.AUTH_SESSION)}`, async (route) => {
    if (unlocked) {
      await fulfillJson(route, { tokenRequired: false });
    } else {
      await route.fulfill({ status: 401, contentType: "application/json", body: "{}" });
    }
  });

  await page.route(`**${buildApiUrl(ApiRoutes.AUTH_UNLOCK)}`, async (route) => {
    unlocked = true;
    await fulfillJson(route, { ok: true });
  });

  return {
    resolve: () => {
      unlocked = true;
    },
  };
}

export async function installExternalUrlMock(
  page: Page,
  resolved: { url: string } = { url: "https://open.spotify.com" },
): Promise<void> {
  await registerJsonRoute(page, `${ApiRoutes.EXTERNAL_URL}**`, resolved);
}

export async function installAppShellMocks(
  page: Page,
  {
    mockPlaylistStatus = true,
    settings = SETTINGS_PAYLOAD.data,
    settingsMetadata = SETTINGS_METADATA_PAYLOAD.data,
    supportedFormats = SUPPORTED_FORMATS_PAYLOAD.data,
    spotifyAuthStatus = SPOTIFY_AUTH_STATUS_PAYLOAD,
  }: AppShellMockOptions = {},
): Promise<AppShellMockGuard> {
  let unhandledRequestMessage: string | null = null;
  let resolveUnhandledRequest: ((message: string) => void) | null = null;

  const unhandledRequestPromise = new Promise<string>((resolve) => {
    resolveUnhandledRequest = resolve;
  });

  await page.route("**/api/**", async (route) => {
    const message = `Unhandled API request: ${route.request().method()} ${route.request().url()}`;

    if (!unhandledRequestMessage) {
      unhandledRequestMessage = message;
      resolveUnhandledRequest?.(message);
    }

    await route.abort("failed");
  });

  await mockSettingsPageData(page, { settings, settingsMetadata, supportedFormats });
  await mockSpotifyAuthStatus(page, spotifyAuthStatus);
  await mockAuthSession(page, { tokenRequired: false });

  await page.route("**/api/events", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      headers: {
        "cache-control": "no-cache",
        connection: "keep-alive",
      },
      body: SSE_PAYLOAD,
    });
  });

  if (mockPlaylistStatus) {
    await page.route("**/api/playlist/status", async (route) => {
      await fulfillJson(route, DOWNLOAD_STATUS_PAYLOAD);
    });
  }

  return {
    async assertNoUnhandledRequests(timeoutMs = 250): Promise<void> {
      if (unhandledRequestMessage) {
        throw new Error(unhandledRequestMessage);
      }

      const outcome = await Promise.race([
        unhandledRequestPromise.then((message) => ({ message })),
        page.waitForTimeout(timeoutMs).then(() => null),
      ]);

      if (outcome?.message) {
        throw new Error(outcome.message);
      }
    },
    async waitForUnhandledRequest(timeoutMs = 5_000): Promise<string> {
      if (unhandledRequestMessage) {
        return unhandledRequestMessage;
      }

      const outcome = await Promise.race([
        unhandledRequestPromise.then((message) => ({ message })),
        page.waitForTimeout(timeoutMs).then(() => null),
      ]);

      if (!outcome?.message) {
        throw new Error(`Timed out waiting for an unhandled API request after ${timeoutMs}ms`);
      }

      return outcome.message;
    },
  };
}
