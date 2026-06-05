import { type Page } from "@playwright/test";

interface AppShellMockOptions {
  mockPlaylistStatus?: boolean;
}

interface AppShellMockGuard {
  assertNoUnhandledRequests(timeoutMs?: number): Promise<void>;
  waitForUnhandledRequest(timeoutMs?: number): Promise<string>;
}

const SETTINGS_PAYLOAD = {
  data: [{ key: "UI_LANGUAGE", value: "en", updatedAt: new Date(0).toISOString() }],
};

const DOWNLOAD_STATUS_PAYLOAD = {
  playlistStatusMap: {},
  trackStatusMap: {},
  albumTrackCountMap: {},
};

const SSE_PAYLOAD = ": connected\n\n";

export async function installAppShellMocks(
  page: Page,
  { mockPlaylistStatus = true }: AppShellMockOptions = {},
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

  await page.route("**/api/settings", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SETTINGS_PAYLOAD),
    });
  });

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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(DOWNLOAD_STATUS_PAYLOAD),
      });
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
