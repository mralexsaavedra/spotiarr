import type { SpotifySearchResults } from "@spotiarr/shared";
import { expect, test } from "../../fixtures/test";
import { mockSearchResults } from "../../helpers/api-mocks";
import { SearchPage } from "../../search/search-page";

const populatedResults: SpotifySearchResults = {
  tracks: [
    {
      id: "track-1",
      name: "Digital Love",
      artist: "Daft Punk",
      artists: [
        { name: "Daft Punk", url: "https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi" },
      ],
      album: "Discovery",
      albumId: "album-1",
      albumCoverUrl: "/logo.svg",
      albumUrl: "https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc",
      durationMs: 301000,
      primaryArtist: "artist-1",
      spotifyUrl: "https://open.spotify.com/track/2VEZx7NWsZ1D0eJ4uv5Fym",
      trackUrl: "https://open.spotify.com/track/2VEZx7NWsZ1D0eJ4uv5Fym",
    },
  ],
  albums: [
    {
      artistId: "artist-1",
      artistName: "Daft Punk",
      artistImageUrl: null,
      albumId: "album-1",
      albumName: "Discovery",
      coverUrl: null,
      spotifyUrl: "https://open.spotify.com/album/2noRn2Aes5aoNVsU6iWThc",
      totalTracks: 14,
    },
  ],
  artists: [
    {
      id: "artist-1",
      name: "Daft Punk",
      image: null,
      spotifyUrl: "https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi",
    },
  ],
};

test.describe("Mocked search flows", () => {
  test("shows a loading state before rendering populated results", async ({ page }) => {
    await mockSearchResults(page, {
      query: "daft",
      results: populatedResults,
      delayMs: 1_000,
    });

    await page.goto("/search?q=daft", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("status", { name: "Loading" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Top result" })).toBeVisible();
    await expect(page.getByText("Digital Love")).toBeVisible();
  });

  test("shows the no-results state when the mocked search payload is empty", async ({ page }) => {
    await mockSearchResults(page, {
      query: "missing",
      results: {
        tracks: [],
        albums: [],
        artists: [],
      },
    });

    await page.goto("/search?q=missing", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("No results found")).toBeVisible();
  });

  test("renders populated track, artist, and album content from mocked search results", async ({
    page,
  }) => {
    await mockSearchResults(page, {
      query: "daft",
      results: populatedResults,
    });

    await page.goto("/search?q=daft", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Top result" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tracks" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Albums" })).toBeVisible();
    await expect(page.getByText("Digital Love")).toBeVisible();
    await expect(page.getByText("Discovery")).toBeVisible();
    await expect(page.getByText("Daft Punk").first()).toBeVisible();
  });
});

test.describe("Search smoke", () => {
  test("renders the empty search state with bootstrap mocks only", async ({ appShell, page }) => {
    const searchPage = new SearchPage(page);

    await searchPage.goto();

    await expect(searchPage.emptyStateMessage).toBeVisible();
    await expect(searchPage.emptyStateMessage).toContainText(
      "Type something in the search bar to find tracks, albums, or artists",
    );
    await appShell.assertNoUnhandledRequests();
  });

  test("keeps the shared app shell available on the empty search route", async ({
    appShell,
    page,
  }) => {
    const searchPage = new SearchPage(page);

    await searchPage.goto();

    await expect(searchPage.headerSearchInput).toBeVisible();
    await expect(searchPage.allTab).toBeVisible();
    await appShell.assertNoUnhandledRequests();
  });

  test.describe("missing bootstrap mocks", () => {
    test.use({
      allowUnhandledRequests: true,
      appShellOptions: { mockPlaylistStatus: false },
    });

    test("fails explicitly when a required bootstrap mock is missing", async ({
      appShell,
      page,
    }) => {
      await page.unroute("**/api/playlist/status");

      await page.goto("/search", { waitUntil: "domcontentloaded" });

      await expect(appShell.waitForUnhandledRequest()).resolves.toContain("/api/playlist/status");
      await expect(appShell.assertNoUnhandledRequests()).rejects.toThrow(
        /Unhandled API request: GET/,
      );
    });
  });
});
