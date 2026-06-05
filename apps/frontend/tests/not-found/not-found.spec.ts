import { expect, test, type Page } from "@playwright/test";
import { installAppShellMocks } from "../helpers/api-mocks";
import { NotFoundPage } from "./not-found-page";

const installHomeRouteMocks = async (page: Page) => {
  await page.route("**/api/library/stats", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          totalArtists: 0,
          totalAlbums: 0,
          totalTracks: 0,
          totalSize: 0,
          lastScannedAt: null,
        },
      }),
    });
  });

  await page.route("**/api/library/artists", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });

  await page.route("**/api/library/artwork-backfill/status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
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
      }),
    });
  });

  await page.route("**/api/playlist", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    });
  });
};

test.describe("Not found smoke", () => {
  test("shows the embedded not found view for unknown routes", async ({ page }) => {
    const appShellMocks = await installAppShellMocks(page);

    const notFoundPage = new NotFoundPage(page);

    await notFoundPage.goto();

    await expect(notFoundPage.title).toBeVisible();
    await expect(notFoundPage.description).toBeVisible();
    await appShellMocks.assertNoUnhandledRequests();
  });

  test("recovers to the home route when Go Home is activated", async ({ page }) => {
    const appShellMocks = await installAppShellMocks(page);
    await installHomeRouteMocks(page);

    const notFoundPage = new NotFoundPage(page);

    await notFoundPage.goto();
    await notFoundPage.goHome();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("Your Library")).toBeVisible();
    await appShellMocks.assertNoUnhandledRequests();
  });
});
