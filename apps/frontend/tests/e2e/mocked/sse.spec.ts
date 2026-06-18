import { expect, test } from "../../fixtures/test";
import {
  buildHistoryItem,
  buildLibraryArtist,
  buildPlaylist,
  buildRelease,
  installFeedMocks,
  installLibraryMocks,
  installPlaylistMocks,
} from "../../helpers/api-mocks";

test.describe("SSE live updates", () => {
  test("emits download-history-updated and the history view refetches to show updated data", async ({
    page,
  }) => {
    let requestCount = 0;

    await page.route("**/api/history/downloads", async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [buildHistoryItem({ playlistName: "Old Item" })],
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [buildHistoryItem({ playlistName: "New Item" })],
          }),
        });
      }
    });

    await page.route("**/api/history/tracks", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    await installLibraryMocks(page);
    await installPlaylistMocks(page, {
      playlists: [buildPlaylist({ id: "history-playlist-1", name: "Old Item" })],
    });

    // Gate the SSE stream so it fires only after we confirm the first render.
    // appShell registers /api/events first; this route is registered later and wins.
    let sseResolve!: () => void;
    const sseGate = new Promise<void>((resolve) => {
      sseResolve = resolve;
    });

    await page.route("**/api/events", async (route) => {
      await sseGate;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
        body: "event: download-history-updated\ndata: {}\n\n",
      });
    });

    await page.goto("/history", { waitUntil: "domcontentloaded" });

    // Confirm the initial render before allowing the SSE event to fire
    await expect(page.getByText("Old Item")).toBeVisible();

    // Release the SSE gate — the event fires, triggering a refetch
    sseResolve();

    await expect(page.getByText("New Item")).toBeVisible();
  });

  test("emits playlists-updated and the home view refetches to show updated playlists", async ({
    page,
  }) => {
    // playlists-updated invalidates queryKeys.playlists (["playlists"]).
    // The Home view renders playlists via usePlaylistsQuery — a visible place to
    // assert the refetch.
    let playlistsCount = 0;

    await installLibraryMocks(page, {
      artists: [buildLibraryArtist({ name: "Some Artist", image: null })],
    });

    // Override the /api/playlist route registered by the appShell fixture.
    // Last route wins in Playwright, so this handler takes precedence.
    await page.route("**/api/playlist", async (route) => {
      playlistsCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            buildPlaylist({
              id: "sse-pl-1",
              name: playlistsCount === 1 ? "Old Playlist" : "New Playlist",
            }),
          ],
        }),
      });
    });

    let sseResolve!: () => void;
    const sseGate = new Promise<void>((resolve) => {
      sseResolve = resolve;
    });

    await page.route("**/api/events", async (route) => {
      await sseGate;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
        body: "event: playlists-updated\ndata: {}\n\n",
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Old Playlist")).toBeVisible();

    sseResolve();

    await expect(page.getByText("New Playlist")).toBeVisible();
  });

  test("emits library-updated and the home view refetches to show updated library artists", async ({
    page,
  }) => {
    let libraryArtistsCount = 0;

    await installLibraryMocks(page, {
      artists: [buildLibraryArtist({ name: "Old Artist", image: null })],
    });
    await installPlaylistMocks(page, { playlists: [] });

    // Override library/artists to return updated data after SSE (last route wins)
    await page.route("**/api/library/artists", async (route) => {
      libraryArtistsCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [
            buildLibraryArtist({
              name: libraryArtistsCount === 1 ? "Old Artist" : "New Artist",
              image: null,
            }),
          ],
        }),
      });
    });

    let sseResolve!: () => void;
    const sseGate = new Promise<void>((resolve) => {
      sseResolve = resolve;
    });

    await page.route("**/api/events", async (route) => {
      await sseGate;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
        body: "event: library-updated\ndata: {}\n\n",
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Old Artist")).toBeVisible();

    sseResolve();

    await expect(page.getByText("New Artist")).toBeVisible();
  });

  test("emits feed-updated and the releases view refetches to show updated releases", async ({
    page,
  }) => {
    let releasesCount = 0;

    await installFeedMocks(page, {
      releases: [buildRelease({ albumName: "Old Release" })],
      followedArtists: [],
    });

    // Override releases to return updated data after SSE (last route wins)
    await page.route("**/api/feed/releases", async (route) => {
      releasesCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          releasesCount === 1
            ? [buildRelease({ albumName: "Old Release" })]
            : [buildRelease({ albumName: "New Release" })],
        ),
      });
    });

    let sseResolve!: () => void;
    const sseGate = new Promise<void>((resolve) => {
      sseResolve = resolve;
    });

    await page.route("**/api/events", async (route) => {
      await sseGate;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
        body: "event: feed-updated\ndata: {}\n\n",
      });
    });

    await page.goto("/releases", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Old Release")).toBeVisible();

    sseResolve();

    await expect(page.getByText("New Release")).toBeVisible();
  });

  test("emits catalog-updated and the artists view refetches to show updated followed artists", async ({
    page,
  }) => {
    let followedArtistsCount = 0;

    await installFeedMocks(page, {
      followedArtists: [
        {
          id: "cat-1",
          name: "Old Band",
          image: null,
          spotifyUrl: "https://open.spotify.com/artist/cat-1",
        },
      ],
      releases: [],
    });

    // Override feed/artists to return updated data after SSE (last route wins)
    await page.route("**/api/feed/artists", async (route) => {
      followedArtistsCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          followedArtistsCount === 1
            ? [
                {
                  id: "cat-1",
                  name: "Old Band",
                  image: null,
                  spotifyUrl: "https://open.spotify.com/artist/cat-1",
                },
              ]
            : [
                {
                  id: "cat-1",
                  name: "New Band",
                  image: null,
                  spotifyUrl: "https://open.spotify.com/artist/cat-1",
                },
              ],
        ),
      });
    });

    let sseResolve!: () => void;
    const sseGate = new Promise<void>((resolve) => {
      sseResolve = resolve;
    });

    await page.route("**/api/events", async (route) => {
      await sseGate;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
        body: "event: catalog-updated\ndata: {}\n\n",
      });
    });

    await page.goto("/artists", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Old Band")).toBeVisible();

    sseResolve();

    await expect(page.getByText("New Band")).toBeVisible();
  });

  test("emits artwork-backfill-updated and the home view shows the backfill status indicator", async ({
    page,
  }) => {
    let backfillStatusCount = 0;

    await installLibraryMocks(page, {
      artists: [buildLibraryArtist({ name: "Some Artist", image: null })],
      artworkBackfillStatus: {
        runId: null,
        status: "idle",
        phase: null,
        totals: 0,
        processed: 0,
        skippedExisting: 0,
        written: 0,
        failed: 0,
        externalCalls: 0,
        lastCheckpoint: null,
        rateLimitUntil: null,
        updatedAt: null,
      },
    });
    await installPlaylistMocks(page, { playlists: [] });

    // Override artwork-backfill/status to return running state after SSE (last route wins)
    await page.route("**/api/library/artwork-backfill/status", async (route) => {
      backfillStatusCount++;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data:
            backfillStatusCount === 1
              ? {
                  runId: null,
                  status: "idle",
                  phase: null,
                  totals: 0,
                  processed: 0,
                  skippedExisting: 0,
                  written: 0,
                  failed: 0,
                  externalCalls: 0,
                  lastCheckpoint: null,
                  rateLimitUntil: null,
                  updatedAt: null,
                }
              : {
                  runId: "r1",
                  status: "running",
                  phase: "fetch",
                  totals: 10,
                  processed: 5,
                  skippedExisting: 0,
                  written: 3,
                  failed: 0,
                  externalCalls: 5,
                  lastCheckpoint: null,
                  rateLimitUntil: null,
                  updatedAt: null,
                },
        }),
      });
    });

    let sseResolve!: () => void;
    const sseGate = new Promise<void>((resolve) => {
      sseResolve = resolve;
    });

    await page.route("**/api/events", async (route) => {
      await sseGate;
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: {
          "cache-control": "no-cache",
          connection: "keep-alive",
        },
        body: 'event: artwork-backfill-updated\ndata: {"status":"running"}\n\n',
      });
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Status is idle initially — indicator should not be rendered
    await expect(page.getByText("Artwork backfill")).not.toBeVisible();

    sseResolve();

    // After SSE fires, status becomes "running" — indicator renders
    await expect(page.getByText(/Artwork backfill/)).toBeVisible();
    await expect(page.getByText("5 processed")).toBeVisible();
  });
});
