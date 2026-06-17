import type { SpotifySearchResults } from "@spotiarr/shared";
import { expect, test } from "../../fixtures/test";
import { installPlaylistMocks, mockSearchResults } from "../../helpers/api-mocks";

// Integrated journey: search → open album result → trigger download
// Albums with a spotifyUrl navigate to /preview?url=... (the preview route).
// The journey therefore goes: search → preview → download CTA.

const SEARCH_QUERY = "discovery";

const ALBUM_SPOTIFY_URL = "https://open.spotify.com/album/journey-album";

const searchResults: SpotifySearchResults = {
  tracks: [],
  albums: [
    {
      artistId: "journey-artist",
      artistName: "Journey Artist",
      artistImageUrl: null,
      albumId: "journey-album",
      albumName: "Journey Album",
      coverUrl: null,
      spotifyUrl: ALBUM_SPOTIFY_URL,
      totalTracks: 1,
    },
  ],
  artists: [],
};

test.describe("Integrated journey flows", () => {
  test("search → open album preview → trigger download", async ({ page }) => {
    let createdPayload: unknown = null;

    await mockSearchResults(page, { query: SEARCH_QUERY, results: searchResults });

    await installPlaylistMocks(page, {
      playlists: [],
      preview: {
        name: "Journey Album",
        type: "album",
        description: null,
        coverUrl: null,
        totalTracks: 1,
        tracks: [
          {
            name: "Journey Track",
            artists: [{ name: "Journey Artist" }],
            album: "Journey Album",
            duration: 200_000,
            trackUrl: "https://open.spotify.com/track/journey-track",
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
          body: JSON.stringify({ id: "journey-playlist-1" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    // Step 1: search and see the album result
    await page.goto(`/search?q=${SEARCH_QUERY}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Journey Album").first()).toBeVisible();

    // Step 2: open the album preview (albums with a Spotify URL navigate to /preview?url=...)
    await page.getByRole("button", { name: "Journey Album by Journey Artist" }).click();

    await expect(page).toHaveURL(/\/preview\?url=/);
    await expect(page.getByRole("heading", { name: "Journey Album", level: 2 })).toBeVisible();

    // Step 3: trigger download
    await page.getByTitle("Download Playlist").click();

    await expect
      .poll(() => createdPayload)
      .toEqual({
        kind: "spotifyUrl",
        spotifyUrl: ALBUM_SPOTIFY_URL,
      });
  });
});
