import { expect, test } from "@playwright/test";
import { installAppShellMocks } from "../helpers/api-mocks";
import { SearchPage } from "./search-page";

test.describe("Search smoke", () => {
  test("renders the empty search state with bootstrap mocks only", async ({ page }) => {
    const appShellMocks = await installAppShellMocks(page);

    const searchPage = new SearchPage(page);

    await searchPage.goto();

    await expect(searchPage.emptyStateMessage).toBeVisible();
    await expect(searchPage.emptyStateMessage).toContainText(
      "Type something in the search bar to find tracks, albums, or artists",
    );
    await appShellMocks.assertNoUnhandledRequests();
  });

  test("keeps the shared app shell available on the empty search route", async ({ page }) => {
    const appShellMocks = await installAppShellMocks(page);

    const searchPage = new SearchPage(page);

    await searchPage.goto();

    await expect(searchPage.headerSearchInput).toBeVisible();
    await expect(searchPage.allTab).toBeVisible();
    await appShellMocks.assertNoUnhandledRequests();
  });

  test("fails explicitly when a required bootstrap mock is missing", async ({ page }) => {
    const appShellMocks = await installAppShellMocks(page, { mockPlaylistStatus: false });

    await page.goto("/search", { waitUntil: "domcontentloaded" });

    await expect(appShellMocks.waitForUnhandledRequest()).resolves.toContain(
      "/api/playlist/status",
    );
    await expect(appShellMocks.assertNoUnhandledRequests()).rejects.toThrow(
      /Unhandled API request: GET/,
    );
  });
});
