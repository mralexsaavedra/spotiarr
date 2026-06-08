import type { FollowedArtist } from "@spotiarr/shared";
import { expect, test } from "../../fixtures/test";
import { installFeedMocks } from "../../helpers/api-mocks";

const followedArtists: FollowedArtist[] = [
  {
    id: "artist-1",
    name: "Daft Punk",
    image: null,
    spotifyUrl: "https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi",
  },
  {
    id: "artist-2",
    name: "Justice",
    image: null,
    spotifyUrl: "https://open.spotify.com/artist/1gR0gsQYfi6joyO1dlp76N",
  },
];

test.describe("Mocked artists flows", () => {
  test("shows the loading state while mocked artists are still in flight", async ({ page }) => {
    const artistGate = Promise.withResolvers<void>();

    await page.route("**/api/feed/artists", async (route) => {
      await artistGate.promise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(followedArtists),
      });
    });
    await page.route("**/api/feed/releases", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.goto("/artists", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("status", { name: "Loading" })).toBeVisible();

    artistGate.resolve();

    await expect(page.getByText("Daft Punk")).toBeVisible();
  });

  test("renders followed artists from mocked feed responses", async ({ page }) => {
    await installFeedMocks(page, { followedArtists, releases: [] });

    await page.goto("/artists", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Followed Artists" })).toBeVisible();
    await expect(page.getByText("Daft Punk")).toBeVisible();
    await expect(page.getByText("Justice")).toBeVisible();
    await expect(page.getByText("Artist").first()).toBeVisible();
  });

  test("renders the artist search fallback when no mocked artist matches the filter", async ({
    page,
  }) => {
    await installFeedMocks(page, { followedArtists, releases: [] });

    await page.goto("/artists", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("Filter artists...").fill("missing artist");

    await expect(page.getByText("No followed artists found.")).toBeVisible();
  });

  test.describe("error state", () => {
    test.use({
      ignoredConsoleErrors: [
        "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
      ],
    });

    test("renders the API error state when the mocked artists request fails", async ({ page }) => {
      await page.route("**/api/feed/artists", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "artists_failed" }),
        });
      });
      await page.route("**/api/feed/releases", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      });

      await page.goto("/artists", { waitUntil: "domcontentloaded" });

      await expect(page.getByText("Failed to load artists.")).toBeVisible();
    });
  });
});
