import { expect, test } from "../../fixtures/test";
import { buildPlaylist, installPlaylistMocks } from "../../helpers/api-mocks";

test.describe("Mocked activity flows", () => {
  test("renders the loading state while the mocked activity playlist list is still resolving", async ({
    page,
  }) => {
    const playlistGate = Promise.withResolvers<void>();

    await page.route("**/api/playlist", async (route) => {
      await playlistGate.promise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: [buildPlaylist({ id: "activity-loading-1", name: "Night Drive" })],
        }),
      });
    });

    await page.goto("/activity", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("status", { name: "Loading" })).toBeVisible();

    playlistGate.resolve();

    await expect(page.getByText("Night Drive")).toBeVisible();
  });

  test("renders the activity list from mocked playlist data", async ({ page }) => {
    await installPlaylistMocks(page, {
      playlists: [
        buildPlaylist({ id: "activity-1", name: "Night Drive" }),
        buildPlaylist({ id: "activity-2", name: "Morning Queue" }),
      ],
    });

    await page.goto("/activity", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await expect(page.getByText("Night Drive")).toBeVisible();
    await expect(page.getByText("Morning Queue")).toBeVisible();
    await expect(page.getByRole("button", { name: "Clear completed" })).toBeVisible();
  });

  test("renders the empty activity state when the mocked queue has no playlists", async ({
    page,
  }) => {
    await installPlaylistMocks(page, { playlists: [] });

    await page.goto("/activity", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("No downloads in progress")).toBeVisible();
    await expect(
      page.getByText("Your queue looks empty. Add some tracks to see activity here."),
    ).toBeVisible();
  });
});
