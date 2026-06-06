import { type Page } from "@playwright/test";
import {
  ApiRoutes,
  type SettingItem,
  type SettingMetadata,
  type SpotifySearchResults,
  UI_SUPPORTED_AUDIO_FORMATS,
  type SupportedAudioFormat,
} from "@spotiarr/shared";

interface AppShellMockOptions {
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

const DEFAULT_TIMESTAMP = new Date(0).toISOString();

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
  playlistStatusMap: {},
  trackStatusMap: {},
  albumTrackCountMap: {},
};

const SSE_PAYLOAD = ": connected\n\n";

const SPOTIFY_AUTH_STATUS_PAYLOAD: SpotifyAuthStatus = {
  authenticated: false,
  hasRefreshToken: false,
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
