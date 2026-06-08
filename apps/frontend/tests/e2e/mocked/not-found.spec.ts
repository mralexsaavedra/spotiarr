import { expect, test } from "../../fixtures/test";
import { installLibraryMocks, installPlaylistMocks } from "../../helpers/api-mocks";

test.describe("Not found smoke", () => {
  test("shows the embedded not found view for unknown routes", async ({ page }) => {
    await page.goto("/does-not-exist", { waitUntil: "domcontentloaded" });

    await expect(page.getByPlaceholder("Search or paste link...")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
    await expect(
      page.getByText("The page you are looking for does not exist or has been moved."),
    ).toBeVisible();
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

    await page.goto("/does-not-exist", { waitUntil: "domcontentloaded" });
    await expect(page.getByPlaceholder("Search or paste link...")).toBeVisible();

    await page.getByRole("button", { name: "Go Home" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("Your Library")).toBeVisible();
  });
});
