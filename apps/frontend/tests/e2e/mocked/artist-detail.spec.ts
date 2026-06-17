import type { ArtistDetail } from "@spotiarr/shared";
import { expect, test } from "../../fixtures/test";
import { buildRelease, installArtistMocks, installPlaylistMocks } from "../../helpers/api-mocks";

test.describe("Mocked artist detail flows", () => {
  test("renders the artist discography from mocked artist data", async ({ page }) => {
    const artistId = "disc-artist";
    const detail: ArtistDetail = {
      id: artistId,
      name: "Disc Artist",
      image: null,
      spotifyUrl: null,
      followers: null,
      genres: [],
      albums: [buildRelease({ artistId: "disc-artist", albumName: "Disc Album One" })],
      isFollowed: true,
    };

    await installArtistMocks(page, { artistId, detail });

    await page.goto(`/artist/${artistId}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Disc Artist" })).toBeVisible();
    await expect(page.getByText("Disc Album One")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Discography" })).toBeVisible();
  });

  test("shows the Download All button when the artist has a Spotify URL", async ({ page }) => {
    const artistId = "disc-artist";
    const detail: ArtistDetail = {
      id: artistId,
      name: "Disc Artist",
      image: null,
      spotifyUrl: "https://open.spotify.com/artist/disc-artist",
      followers: null,
      genres: [],
      albums: [],
      isFollowed: true,
    };

    await installArtistMocks(page, { artistId, detail });

    await page.goto(`/artist/${artistId}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("button", { name: "Download All" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Download All" })).toBeEnabled();
  });

  test("shows the Downloaded state when the artist playlist is already downloaded", async ({
    page,
  }) => {
    const artistId = "dl-artist";
    const detail: ArtistDetail = {
      id: artistId,
      name: "Dl Artist",
      image: null,
      spotifyUrl: "https://open.spotify.com/artist/dl-artist",
      followers: null,
      genres: [],
      albums: [],
      isFollowed: true,
    };

    await installArtistMocks(page, { artistId, detail });

    // Override the appShell playlist/status mock — last route wins in Playwright
    await page.route("**/api/playlist/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          playlistStatusMap: {
            "https://open.spotify.com/artist/dl-artist": "completed",
          },
          trackStatusMap: {},
          albumTrackCountMap: {},
        }),
      });
    });

    await page.goto(`/artist/${artistId}`, { waitUntil: "domcontentloaded" });

    await expect(
      page
        .getByText("Artist Downloaded")
        .or(page.getByRole("button", { name: "Artist Downloaded" })),
    ).toBeVisible();
  });

  test("navigates to album preview when an album card is clicked", async ({ page }) => {
    const artistId = "disc-artist";
    const album = buildRelease({ artistId: "disc-artist", albumName: "Disc Album One" });
    const detail: ArtistDetail = {
      id: artistId,
      name: "Disc Artist",
      image: null,
      spotifyUrl: null,
      followers: null,
      genres: [],
      albums: [album],
      isFollowed: true,
    };

    await installArtistMocks(page, { artistId, detail });
    await installPlaylistMocks(page, { playlists: [] });

    await page.goto(`/artist/${artistId}`, { waitUntil: "domcontentloaded" });

    // AlbumCard renders an accessible button with aria-label "<name> by <artist>"
    await page.getByRole("button", { name: "Disc Album One by Release Artist" }).click();

    await expect(page).toHaveURL(/\/album\/disc-artist\/release-album-1/);
  });

  test.describe("error state", () => {
    test.use({
      ignoredConsoleErrors: ["Failed to load resource: the server responded with a status of 500"],
    });

    test("renders the error state when artist fetch fails", async ({ page }) => {
      await page.route("**/api/artist/bad-artist**", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "artist_fetch_failed" }),
        });
      });

      await page.goto("/artist/bad-artist", { waitUntil: "domcontentloaded" });

      await expect(page.getByText("Failed to load artist details.")).toBeVisible();
    });
  });
});
