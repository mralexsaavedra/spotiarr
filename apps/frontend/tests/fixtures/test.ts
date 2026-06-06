import { expect, test as base, type Page } from "@playwright/test";
import {
  installAppShellMocks,
  type AppShellMockGuard,
  type AppShellMockOptions,
} from "../helpers/api-mocks";

interface MockedFixtures {
  appShell: AppShellMockGuard;
}

interface MockedFixtureOptions {
  allowUnhandledRequests: boolean;
  appShellOptions: AppShellMockOptions;
}

const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost"]);

function shouldIgnoreConsoleError(message: string): boolean {
  return message === "EventSource failed: Event";
}

async function blockExternalNetwork(page: Page): Promise<void> {
  await page.route(/^https?:\/\//, async (route) => {
    const url = new URL(route.request().url());

    if (ALLOWED_HOSTS.has(url.hostname)) {
      await route.continue();
      return;
    }

    await route.abort("blockedbyclient");
  });
}

export const test = base.extend<MockedFixtures & MockedFixtureOptions>({
  allowUnhandledRequests: [false, { option: true }],
  appShellOptions: [{}, { option: true }],
  appShell: [
    async ({ allowUnhandledRequests, appShellOptions, page }, applyFixture) => {
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on("console", (message) => {
        if (message.type() === "error" && !shouldIgnoreConsoleError(message.text())) {
          consoleErrors.push(message.text());
        }
      });

      page.on("pageerror", (error) => {
        pageErrors.push(error.message);
      });

      await blockExternalNetwork(page);

      const appShell = await installAppShellMocks(page, appShellOptions);

      await applyFixture(appShell);

      if (!allowUnhandledRequests) {
        await appShell.assertNoUnhandledRequests(500);
      }
      expect(consoleErrors, "Unexpected browser console errors").toEqual([]);
      expect(pageErrors, "Unexpected uncaught page errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
