import type { ArtistDetail, ArtistRelease, NormalizedTrack } from "@spotiarr/shared";
import { TrackStatusEnum } from "@spotiarr/shared";
import { expect, test } from "../../fixtures/test";
import { buildRelease, installArtistMocks } from "../../helpers/api-mocks";

const artistId = "test-artist";
const albumId = "test-album";

const release: ArtistRelease = buildRelease({
  artistId,
  albumId,
  artistName: "Test Artist",
  albumName: "Test Album",
});

const track: NormalizedTrack = {
  id: "track-1",
  name: "Track One",
  artist: "Test Artist",
  artists: [{ name: "Test Artist" }],
  album: "Test Album",
  durationMs: 210_000,
  spotifyUrl: "https://open.spotify.com/track/track-1",
  trackUrl: "https://open.spotify.com/track/track-1",
};

const artistDetail: ArtistDetail = {
  id: artistId,
  name: "Test Artist",
  image: null,
  albums: [release],
  isFollowed: false,
};

test.describe("Mocked album detail flows", () => {
  test("renders the album detail with tracks from mocked artist data", async ({ page }) => {
    await installArtistMocks(page, {
      artistId,
      detail: artistDetail,
      albums: [release],
      tracks: [track],
    });

    await page.goto(`/album/${artistId}/${albumId}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Track One")).toBeVisible();
    await expect(page.getByTitle("Download Playlist")).toBeVisible();
  });

  test("shows the skeleton loading state while album tracks are in flight", async ({ page }) => {
    const tracksGate = Promise.withResolvers<void>();

    // Register broader wildcard first so the more-specific tracks route (registered second) wins.
    await page.route(`**/api/artist/loading-artist/albums**`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });
    await page.route(`**/api/artist/loading-artist/albums/loading-album/tracks`, async (route) => {
      await tracksGate.promise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([track]),
      });
    });

    await page.goto("/album/loading-artist/loading-album", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Track One")).not.toBeVisible();

    tracksGate.resolve();

    await expect(page.getByText("Track One")).toBeVisible();
  });

  test.describe("error state", () => {
    test.use({
      ignoredConsoleErrors: [
        "Failed to load resource: the server responded with a status of 500 (Internal Server Error)",
      ],
    });

    test("shows the error state when album tracks fetch fails", async ({ page }) => {
      // Register broader wildcard first so the more-specific tracks route (registered second) wins.
      await page.route(`**/api/artist/${artistId}/albums**`, async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([release]),
        });
      });
      await page.route(`**/api/artist/${artistId}/albums/${albumId}/tracks`, async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "tracks_failed" }),
        });
      });

      await page.goto(`/album/${artistId}/${albumId}`, { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("button", { name: "Go back" })).toBeVisible();
    });

    test("shows the Retry Failed button when a track has Error status", async ({ page }) => {
      await installArtistMocks(page, {
        artistId,
        detail: artistDetail,
        albums: [release],
        tracks: [track],
      });

      // Override the appShell playlist/status mock — last route wins in Playwright
      await page.route("**/api/playlist/status", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            playlistStatusMap: {},
            trackStatusMap: {
              [track.trackUrl!]: TrackStatusEnum.Error,
            },
            albumTrackCountMap: {},
          }),
        });
      });

      await page.goto(`/album/${artistId}/${albumId}`, { waitUntil: "domcontentloaded" });

      await expect(page.getByText("Track One")).toBeVisible();
      await expect(page.getByRole("button", { name: "Retry Failed" })).toBeVisible();
    });

    test("clicking Retry Failed fires a POST for the failed track", async ({ page }) => {
      let retryPayload: unknown = null;

      await installArtistMocks(page, {
        artistId,
        detail: artistDetail,
        albums: [release],
        tracks: [track],
      });

      // Override the appShell playlist/status mock — last route wins in Playwright
      await page.route("**/api/playlist/status", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            playlistStatusMap: {},
            trackStatusMap: {
              [track.trackUrl!]: TrackStatusEnum.Error,
            },
            albumTrackCountMap: {},
          }),
        });
      });

      await page.route("**/api/playlist", async (route) => {
        if (route.request().method() === "POST") {
          retryPayload = route.request().postDataJSON();
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ id: "retried-playlist-1" }),
          });
          return;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: [] }),
        });
      });

      await page.goto(`/album/${artistId}/${albumId}`, { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("button", { name: "Retry Failed" })).toBeVisible();
      await page.getByRole("button", { name: "Retry Failed" }).click();

      await expect
        .poll(() => retryPayload)
        .toEqual({
          kind: "spotifyUrl",
          spotifyUrl: track.trackUrl,
        });
    });
  });

  test("shows delete confirm modal when the delete button is clicked", async ({ page }) => {
    const completedTrack: NormalizedTrack = {
      ...track,
      id: "track-completed",
      name: "Completed Track",
    };

    await installArtistMocks(page, {
      artistId,
      detail: artistDetail,
      albums: [release],
      tracks: [completedTrack],
    });

    // Override playlist/status to mark the track as completed so isSaved=true and delete is enabled
    await page.route("**/api/playlist/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          playlistStatusMap: {},
          trackStatusMap: {
            [completedTrack.trackUrl!]: TrackStatusEnum.Completed,
          },
          albumTrackCountMap: {},
        }),
      });
    });

    await page.goto(`/album/${artistId}/${albumId}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Completed Track")).toBeVisible();
    await page.getByTitle("Delete Playlist").click();

    const confirmDialog = page.getByRole("dialog");

    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(confirmDialog.getByRole("button", { name: "Delete" })).toBeVisible();
  });

  test("fires the download CTA and captures the playlist creation POST", async ({ page }) => {
    let createdPayload: unknown = null;

    await installArtistMocks(page, {
      artistId,
      detail: artistDetail,
      albums: [release],
      tracks: [track],
    });

    await page.route("**/api/playlist", async (route) => {
      if (route.request().method() === "POST") {
        createdPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ id: "album-playlist-1" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto(`/album/${artistId}/${albumId}`, { waitUntil: "domcontentloaded" });

    await page.getByTitle("Download Playlist").click();

    await expect
      .poll(() => createdPayload)
      .toEqual({
        kind: "album",
        artistId,
        albumId,
      });
  });
});
