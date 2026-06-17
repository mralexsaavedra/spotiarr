import type { ArtistDetail } from "@spotiarr/shared";
import { expect, test } from "../../fixtures/test";
import { buildRelease, installArtistMocks, installFeedMocks } from "../../helpers/api-mocks";

test.describe("Mocked releases flows", () => {
  test("shows the loading state while releases are in flight", async ({ page }) => {
    const releasesGate = Promise.withResolvers<void>();

    await page.route("**/api/feed/releases", async (route) => {
      await releasesGate.promise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([buildRelease()]),
      });
    });
    await page.route("**/api/feed/artists", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/releases", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("status", { name: "Loading" })).toBeVisible();

    releasesGate.resolve();

    await expect(page.getByText("Release Album")).toBeVisible();
  });

  test("renders a populated releases grid from mocked feed data", async ({ page }) => {
    await installFeedMocks(page, { releases: [buildRelease()] });

    await page.goto("/releases", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Releases" })).toBeVisible();
    await expect(page.getByText("Release Album")).toBeVisible();
    await expect(page.getByText("Release Artist")).toBeVisible();
  });

  test("renders the empty state when no releases are returned", async ({ page }) => {
    await installFeedMocks(page, { releases: [] });

    await page.goto("/releases", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("No new releases")).toBeVisible();
    await expect(
      page.getByText("No recent releases found from your followed artists."),
    ).toBeVisible();
  });

  test.describe("error state", () => {
    test.use({
      ignoredConsoleErrors: [
        "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
      ],
    });

    test("renders the error state when the releases request fails", async ({ page }) => {
      await page.route("**/api/feed/releases", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "releases_failed" }),
        });
      });
      await page.route("**/api/feed/artists", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.goto("/releases", { waitUntil: "domcontentloaded" });

      await expect(page.getByText("Failed to load releases.")).toBeVisible();
    });
  });

  test("navigates to album detail when a release card is clicked", async ({ page }) => {
    const release = buildRelease();

    const artistDetail: ArtistDetail = {
      id: "release-artist-1",
      name: "Release Artist",
      image: null,
      albums: [release],
      isFollowed: false,
    };

    await installFeedMocks(page, { releases: [release] });
    await installArtistMocks(page, {
      artistId: "release-artist-1",
      detail: artistDetail,
      albums: [release],
      tracks: [],
    });

    await page.goto("/releases", { waitUntil: "domcontentloaded" });

    // AlbumCard renders an accessible button with aria-label "<name> by <artist>"
    await page.getByRole("button", { name: "Release Album by Release Artist" }).click();

    await expect(page).toHaveURL(/\/album\/release-artist-1\/release-album-1/);
  });
});
