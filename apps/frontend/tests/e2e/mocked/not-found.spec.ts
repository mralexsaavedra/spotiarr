import { expect, test } from "../../fixtures/test";
import { installLibraryMocks, installPlaylistMocks } from "../../helpers/api-mocks";
import { NotFoundPage } from "../../not-found/not-found-page";

test.describe("Not found smoke", () => {
  test("shows the embedded not found view for unknown routes", async ({ page }) => {
    const notFoundPage = new NotFoundPage(page);

    await notFoundPage.goto();

    await expect(notFoundPage.title).toBeVisible();
    await expect(notFoundPage.description).toBeVisible();
  });

  test("recovers to the home route when Go Home is activated", async ({ page }) => {
    await installLibraryMocks(page, {
      artists: [],
      stats: {
        totalArtists: 0,
        totalAlbums: 0,
        totalTracks: 0,
        totalSize: 0,
        lastScannedAt: null,
      },
    });
    await installPlaylistMocks(page, { playlists: [] });

    const notFoundPage = new NotFoundPage(page);

    await notFoundPage.goto();
    await notFoundPage.goHome();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("Your Library")).toBeVisible();
  });
});
