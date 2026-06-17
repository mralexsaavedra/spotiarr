import { expect, test } from "../../fixtures/test";
import { buildHistoryItem, buildPlaylist, installPlaylistMocks } from "../../helpers/api-mocks";

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
});
