import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import { expect, test } from "../../fixtures/test";
import {
  buildPlaylist,
  buildTrack,
  installLibraryAudioMocks,
  installPlaylistMocks,
  installTrackMocks,
} from "../../helpers/api-mocks";

test.describe("Mocked playlist detail flows", () => {
  test("renders the playlist detail with its tracks", async ({ page }) => {
    const playlist = buildPlaylist({ id: "detail-pl-1", name: "Detail Playlist", tracks: [] });
    const track = buildTrack({
      id: "detail-track-1",
      name: "Detail Track",
      playlistId: "detail-pl-1",
    });

    await installPlaylistMocks(page, { playlists: [playlist] });
    await installTrackMocks(page, { tracksByPlaylistId: { "detail-pl-1": [track] } });

    await page.goto("/playlist/detail-pl-1", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Detail Playlist" })).toBeVisible();
    await expect(page.getByText("Detail Track")).toBeVisible();
  });

  test("shows the not-found state when the playlist id does not match any playlist", async ({
    page,
  }) => {
    await installPlaylistMocks(page, { playlists: [] });
    await installTrackMocks(page);

    await page.goto("/playlist/nonexistent-id", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Playlist not found")).toBeVisible();
  });

  test("fires the subscribe toggle when the subscribe button is clicked", async ({ page }) => {
    const playlist = buildPlaylist({
      id: "detail-pl-2",
      name: "Subscribe Playlist",
      type: PlaylistTypeEnum.Playlist,
      subscribed: false,
      tracks: [],
    });

    await installPlaylistMocks(page, { playlists: [playlist] });
    await installTrackMocks(page, { tracksByPlaylistId: { "detail-pl-2": [] } });

    let updatedPayload: Record<string, unknown> | null = null;

    await page.route("**/api/playlist/detail-pl-2", async (route) => {
      const method = route.request().method();

      if (method === "PUT") {
        const body = route.request().postDataJSON() as Record<string, unknown>;

        updatedPayload = body;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ data: { ...playlist, subscribed: true } }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("/playlist/detail-pl-2", { waitUntil: "domcontentloaded" });

    await page.getByRole("button", { name: "Subscribe" }).click();

    await expect.poll(() => updatedPayload).toMatchObject({ subscribed: true });
  });

  test("play controls are visible for a library-mode playlist with downloadable tracks", async ({
    page,
  }) => {
    const playlist = buildPlaylist({
      id: "lib-pl-1",
      name: "Library Playlist",
      type: PlaylistTypeEnum.Playlist,
      subscribed: true,
      tracks: [],
    });
    const track = buildTrack({
      id: "lib-track-1",
      name: "Library Track",
      playlistId: "lib-pl-1",
      status: TrackStatusEnum.Completed,
      audioUrl: "/api/library/audio?path=/library/test.mp3",
    });

    await installLibraryAudioMocks(page);
    await installPlaylistMocks(page, { playlists: [playlist] });
    await installTrackMocks(page, { tracksByPlaylistId: { "lib-pl-1": [track] } });

    await page.goto("/playlist/lib-pl-1?mode=library", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("button", { name: "Play track" })).toBeVisible();
  });

  test.describe("error state", () => {
    test("shows the Retry Failed button when a track has Error status", async ({ page }) => {
      const playlist = buildPlaylist({
        id: "error-pl-1",
        name: "Error Playlist",
        type: PlaylistTypeEnum.Playlist,
        subscribed: false,
        tracks: [],
      });
      const errorTrack = buildTrack({
        id: "error-track-1",
        name: "Failed Track",
        playlistId: "error-pl-1",
        status: TrackStatusEnum.Error,
      });

      await installPlaylistMocks(page, { playlists: [playlist] });
      await installTrackMocks(page, { tracksByPlaylistId: { "error-pl-1": [errorTrack] } });

      await page.goto("/playlist/error-pl-1", { waitUntil: "domcontentloaded" });

      await expect(page.getByText("Failed Track")).toBeVisible();
      await expect(page.getByRole("button", { name: "Retry Failed" })).toBeVisible();
    });

    test("clicking Retry Failed posts to the playlist retry endpoint", async ({ page }) => {
      let retryFired = false;

      const playlist = buildPlaylist({
        id: "retry-pl-1",
        name: "Retry Playlist",
        type: PlaylistTypeEnum.Playlist,
        subscribed: false,
        tracks: [],
      });
      const errorTrack = buildTrack({
        id: "retry-track-1",
        name: "Retry Track",
        playlistId: "retry-pl-1",
        status: TrackStatusEnum.Error,
      });

      await installPlaylistMocks(page, { playlists: [playlist] });
      await installTrackMocks(page, { tracksByPlaylistId: { "retry-pl-1": [errorTrack] } });

      await page.route("**/api/playlist/retry-pl-1/retry", async (route) => {
        retryFired = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({}),
        });
      });

      await page.goto("/playlist/retry-pl-1", { waitUntil: "domcontentloaded" });

      await expect(page.getByRole("button", { name: "Retry Failed" })).toBeVisible();
      await page.getByRole("button", { name: "Retry Failed" }).click();

      await expect.poll(() => retryFired).toBe(true);
    });

    test("confirms delete fires DELETE request after confirm modal", async ({ page }) => {
      let deletePayload: { method: string } | null = null;

      const playlist = buildPlaylist({
        id: "delete-pl-1",
        name: "Delete Playlist",
        type: PlaylistTypeEnum.Playlist,
        subscribed: false,
        tracks: [],
      });
      const completedTrack = buildTrack({
        id: "delete-track-1",
        name: "Completed Track",
        playlistId: "delete-pl-1",
        status: TrackStatusEnum.Completed,
      });

      await installPlaylistMocks(page, { playlists: [playlist] });
      await installTrackMocks(page, { tracksByPlaylistId: { "delete-pl-1": [completedTrack] } });

      await page.route("**/api/playlist/delete-pl-1", async (route) => {
        const method = route.request().method();

        if (method === "DELETE") {
          deletePayload = { method };
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({}),
          });
          return;
        }

        await route.continue();
      });

      await page.goto("/playlist/delete-pl-1", { waitUntil: "domcontentloaded" });

      await expect(page.getByText("Completed Track")).toBeVisible();
      await page.getByTitle("Delete Playlist").click();

      const confirmDialog = page.getByRole("dialog");

      await expect(confirmDialog).toBeVisible();
      await confirmDialog.getByRole("button", { name: "Delete" }).click();

      await expect.poll(() => deletePayload).toMatchObject({ method: "DELETE" });
    });
  });
});
