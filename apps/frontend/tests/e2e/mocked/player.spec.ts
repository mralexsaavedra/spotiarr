import { expect, test } from "../../fixtures/test";
import {
  buildPlaylist,
  buildTrack,
  installLibraryAudioMocks,
  installPlaylistMocks,
  installTrackMocks,
} from "../../helpers/api-mocks";

test.describe("Mocked global player flows", () => {
  test("updates the GlobalPlayerBar while playing a library-backed playlist queue", async ({
    page,
  }) => {
    const libraryPlaylist = buildPlaylist({
      id: "library-player-playlist",
      name: "Local Queue",
      spotifyUrl: "spotiarr://library-player-playlist",
      subscribed: true,
      tracks: [],
    });

    await installPlaylistMocks(page, { playlists: [libraryPlaylist] });
    await installTrackMocks(page, {
      tracksByPlaylistId: {
        [libraryPlaylist.id]: [
          buildTrack({
            album: "Album One",
            artist: "Boards of Canada",
            audioUrl: "/api/library/audio?path=/library/boards/track-1.mp3",
            id: "player-track-1",
            name: "Dayvan Cowboy",
            playlistId: libraryPlaylist.id,
          }),
          buildTrack({
            album: "Album Two",
            artist: "Tycho",
            audioUrl: "/api/library/audio?path=/library/tycho/track-2.mp3",
            id: "player-track-2",
            name: "Awake",
            playlistId: libraryPlaylist.id,
          }),
        ],
      },
    });
    await installLibraryAudioMocks(page);

    await page.goto(`/playlist/${libraryPlaylist.id}?mode=library`, {
      waitUntil: "domcontentloaded",
    });

    await page.getByRole("button", { name: "Play track" }).first().click();

    const playerBar = page.getByRole("region", { name: "Now playing" });

    await expect(playerBar).toBeVisible();
    await expect(playerBar.getByText("Dayvan Cowboy")).toBeVisible();
    await expect(playerBar.getByText("Boards of Canada")).toBeVisible();

    await page.getByRole("button", { name: "Next track" }).click();

    await expect(playerBar.getByText("Awake")).toBeVisible();
    await expect(playerBar.getByText("Tycho")).toBeVisible();

    await playerBar.getByRole("button", { name: "Pause" }).click();

    await expect(playerBar.getByRole("button", { name: "Play" })).toBeVisible();
    await expect(playerBar.getByRole("button", { name: /Open Awake by Tycho/ })).toBeVisible();
  });
});
