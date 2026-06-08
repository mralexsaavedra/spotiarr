import type { SpotifyPlaylist } from "@spotiarr/shared";
import { expect, test } from "../../fixtures/test";
import { buildPlaylist, installPlaylistMocks } from "../../helpers/api-mocks";

const spotifyPlaylist: SpotifyPlaylist = {
  id: "spotify-playlist-1",
  name: "Road Trip",
  image: null,
  owner: "Alex",
  ownerUrl: "https://open.spotify.com/user/alex",
  tracks: 12,
  spotifyUrl: "https://open.spotify.com/playlist/road-trip",
};

test.describe("Mocked my playlists flows", () => {
  test("renders the empty playlists state when Spotify returns no playlists", async ({ page }) => {
    await installPlaylistMocks(page, {
      myPlaylists: [],
      playlists: [],
    });

    await page.goto("/my-playlists", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "My Spotify Playlists" })).toBeVisible();
    await expect(page.getByText("No playlists found.")).toBeVisible();
  });

  test("renders the My Playlists list and navigates into the preview flow", async ({ page }) => {
    await installPlaylistMocks(page, {
      myPlaylists: [spotifyPlaylist],
      playlists: [],
      preview: {
        name: spotifyPlaylist.name,
        type: "playlist",
        description: "A mocked preview playlist.",
        coverUrl: null,
        owner: spotifyPlaylist.owner,
        ownerUrl: spotifyPlaylist.ownerUrl,
        totalTracks: 1,
        tracks: [
          {
            name: "Midnight City",
            artists: [{ name: "M83", url: "https://open.spotify.com/artist/m83" }],
            album: 'Hurry Up, We"re Dreaming',
            duration: 250_000,
            trackUrl: "https://open.spotify.com/track/midnight-city",
            albumUrl: "https://open.spotify.com/album/hurry-up",
          },
        ],
      },
    });

    await page.goto("/my-playlists", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "My Spotify Playlists" })).toBeVisible();
    await expect(page.getByText("Road Trip")).toBeVisible();

    await page.getByText("Road Trip").click();

    await expect(page).toHaveURL(/\/preview\?url=/);
    await expect(page.getByRole("heading", { name: "Road Trip" })).toBeVisible();
    await expect(page.getByTitle("Download Playlist")).toBeVisible();
    await expect(page.getByRole("button", { name: "Subscribe" })).toBeVisible();
  });

  test("fires the playlist creation trigger from the preview download CTA", async ({ page }) => {
    let createdPayload: unknown = null;

    await installPlaylistMocks(page, {
      myPlaylists: [spotifyPlaylist],
      playlists: [],
      preview: {
        name: spotifyPlaylist.name,
        type: "playlist",
        description: "A mocked preview playlist.",
        coverUrl: null,
        owner: spotifyPlaylist.owner,
        ownerUrl: spotifyPlaylist.ownerUrl,
        totalTracks: 1,
        tracks: [
          {
            name: "Midnight City",
            artists: [{ name: "M83", url: "https://open.spotify.com/artist/m83" }],
            album: 'Hurry Up, We"re Dreaming',
            duration: 250_000,
            trackUrl: "https://open.spotify.com/track/midnight-city",
            albumUrl: "https://open.spotify.com/album/hurry-up",
          },
        ],
      },
    });
    await page.route("**/api/playlist", async (route) => {
      if (route.request().method() === "POST") {
        createdPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            buildPlaylist({
              id: "created-playlist-1",
              spotifyUrl: spotifyPlaylist.spotifyUrl,
              name: spotifyPlaylist.name,
            }),
          ),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto(`/preview?url=${encodeURIComponent(spotifyPlaylist.spotifyUrl)}`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByTitle("Download Playlist").click();

    await expect
      .poll(() => createdPayload)
      .toEqual({
        kind: "spotifyUrl",
        spotifyUrl: spotifyPlaylist.spotifyUrl,
      });
  });

  test("fires the subscribe trigger by creating and updating the mocked playlist", async ({
    page,
  }) => {
    let createdPayload: unknown = null;
    let updatedPayload: unknown = null;

    await installPlaylistMocks(page, {
      myPlaylists: [spotifyPlaylist],
      playlists: [],
      preview: {
        name: spotifyPlaylist.name,
        type: "playlist",
        description: "A mocked preview playlist.",
        coverUrl: null,
        owner: spotifyPlaylist.owner,
        ownerUrl: spotifyPlaylist.ownerUrl,
        totalTracks: 1,
        tracks: [
          {
            name: "Midnight City",
            artists: [{ name: "M83", url: "https://open.spotify.com/artist/m83" }],
            album: 'Hurry Up, We"re Dreaming',
            duration: 250_000,
            trackUrl: "https://open.spotify.com/track/midnight-city",
            albumUrl: "https://open.spotify.com/album/hurry-up",
          },
        ],
      },
    });
    await page.route("**/api/playlist", async (route) => {
      if (route.request().method() === "POST") {
        createdPayload = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            buildPlaylist({
              id: "created-playlist-2",
              spotifyUrl: spotifyPlaylist.spotifyUrl,
              name: spotifyPlaylist.name,
            }),
          ),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });
    await page.route("**/api/playlist/created-playlist-2", async (route) => {
      updatedPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });

    await page.goto(`/preview?url=${encodeURIComponent(spotifyPlaylist.spotifyUrl)}`, {
      waitUntil: "domcontentloaded",
    });
    await page.getByRole("button", { name: "Subscribe" }).click();

    await expect
      .poll(() => createdPayload)
      .toEqual({
        kind: "spotifyUrl",
        spotifyUrl: spotifyPlaylist.spotifyUrl,
      });
    await expect
      .poll(() => updatedPayload)
      .toEqual({
        subscribed: true,
      });
  });
});
