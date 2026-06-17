import type { ArtistDetail } from "@spotiarr/shared";
import { expect, test } from "../../fixtures/test";
import { buildRelease, installArtistMocks, installPlaylistMocks } from "../../helpers/api-mocks";

test.describe("Artist discography show-more", () => {
  test("reveals additional albums after clicking Show more", async ({ page }) => {
    const artistId = "page-artist";

    // Build 20 albums with unique IDs and descending release dates so sorting
    // is deterministic. Album 01 is the newest, Album 20 the oldest.
    const albums = Array.from({ length: 20 }, (_, i) =>
      buildRelease({
        artistId,
        albumId: `album-${String(i + 1).padStart(2, "0")}`,
        albumName: `Album ${String(i + 1).padStart(2, "0")}`,
        releaseDate: `${2024 - i}-01-01`,
      }),
    );

    const detail: ArtistDetail = {
      id: artistId,
      name: "Page Artist",
      image: null,
      spotifyUrl: null,
      followers: null,
      genres: [],
      albums,
      // isFollowed: false keeps hasMore=false in the discography controller so
      // show-more is a pure client-side slice with no backend pagination fetch.
      isFollowed: false,
    };

    await installArtistMocks(page, { artistId, detail });

    await page.goto(`/artist/${artistId}`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Page Artist" })).toBeVisible();

    // The Show more button must be visible — 20 albums exceeds any pageSize
    await expect(page.getByRole("button", { name: "Show more" })).toBeVisible();

    // Count rendered album cards before clicking.
    // AlbumCard aria-label is "{{name}} by {{artist}}"; artistName defaults to
    // "Release Artist" from buildRelease().
    const albumCards = page.getByRole("button", {
      name: /Album \d+ by Release Artist/,
    });
    const initialCount = await albumCards.count();

    await page.getByRole("button", { name: "Show more" }).click();

    // After clicking, more cards must be visible
    const countAfterClick = await page
      .getByRole("button", { name: /Album \d+ by Release Artist/ })
      .count();

    expect(countAfterClick).toBeGreaterThan(initialCount);
  });
});

test.describe("Playlist preview load-more", () => {
  test("loads the next page of tracks when the list end is reached", async ({ page }) => {
    const spotifyUrl = "https://open.spotify.com/playlist/big-playlist";

    await installPlaylistMocks(page, {
      playlists: [],
      preview: {
        name: "Big Playlist",
        type: "playlist",
        description: null,
        coverUrl: null,
        owner: "Owner",
        totalTracks: 2,
        tracks: [
          {
            name: "First Track",
            artists: [{ name: "Artist" }],
            album: "Album",
            duration: 180_000,
            trackUrl: `${spotifyUrl}/track/1`,
          },
        ],
      },
      previewTracksPage: {
        tracks: [
          {
            name: "Second Track",
            artists: [{ name: "Artist" }],
            album: "Album",
            duration: 180_000,
            trackUrl: `${spotifyUrl}/track/2`,
          },
        ],
        hasMore: false,
        nextOffset: null,
        total: 2,
      },
    });

    await page.goto(`/preview?url=${encodeURIComponent(spotifyUrl)}`, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByText("First Track")).toBeVisible();

    // Scroll to the bottom to trigger Virtuoso endReached → loads page 2
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect(page.getByText("Second Track")).toBeVisible();
  });
});
