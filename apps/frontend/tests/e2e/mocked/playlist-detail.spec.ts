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
});
