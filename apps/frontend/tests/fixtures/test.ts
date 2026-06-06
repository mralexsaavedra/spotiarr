import { expect, test as base, type Page } from "@playwright/test";
import { installAppShellMocks, type AppShellMockGuard } from "../helpers/api-mocks";

interface MockedFixtures {
  appShell: AppShellMockGuard;
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

export const test = base.extend<MockedFixtures>({
  appShell: [
    async ({ page }, applyFixture) => {
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

      const appShell = await installAppShellMocks(page);

      await applyFixture(appShell);

      await appShell.assertNoUnhandledRequests(500);
      expect(consoleErrors, "Unexpected browser console errors").toEqual([]);
      expect(pageErrors, "Unexpected uncaught page errors").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };
