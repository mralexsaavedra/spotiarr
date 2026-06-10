import { expect, test } from "../../fixtures/test";
import {
  buildLibraryAlbum,
  buildLibraryArtist,
  buildLibraryTrack,
  buildPlaylist,
  buildTrack,
  installLibraryAudioMocks,
  installLibraryMocks,
  installPlaylistMocks,
  installTrackMocks,
} from "../../helpers/api-mocks";

const libraryArtist = buildLibraryArtist({
  name: "Test Artist",
  image: undefined,
  albums: [
    buildLibraryAlbum({
      name: "Test Album",
      artist: "Test Artist",
      image: undefined,
      path: "/library/artists/test-artist/test-album",
      year: 2024,
      tracks: [
        buildLibraryTrack({
          name: "Track Alpha",
          artist: "Test Artist",
          album: "Test Album",
          filePath: "/library/artists/test-artist/test-album/01 Track Alpha.mp3",
          trackNumber: 1,
        }),
        buildLibraryTrack({
          name: "Track Beta",
          artist: "Test Artist",
          album: "Test Album",
          filePath: "/library/artists/test-artist/test-album/02 Track Beta.mp3",
          trackNumber: 2,
        }),
      ],
    }),
  ],
});

async function gotoLibraryAlbum(page: import("@playwright/test").Page) {
  await installLibraryMocks(page, { artists: [libraryArtist], artistDetail: libraryArtist });
  await installLibraryAudioMocks(page);

  await page.goto("/library/artist/Test%20Artist/album/Test%20Album", {
    waitUntil: "domcontentloaded",
  });
}

test.describe("player — transport controls labels @smoke", () => {
  test("transport buttons have accessible names derived from i18n keys", async ({ page }) => {
    await gotoLibraryAlbum(page);

    await page.getByRole("button", { name: "Play album" }).click();

    const playerBar = page.getByRole("region", { name: "Now playing" });
    await expect(playerBar).toBeVisible();

    const pauseBtn = playerBar.getByRole("button", { name: "Pause" });
    await expect(pauseBtn).toBeVisible();

    const prevBtn = playerBar.getByRole("button", { name: "Previous track" });
    await expect(prevBtn).toBeVisible();

    const nextBtn = playerBar.getByRole("button", { name: "Next track" });
    await expect(nextBtn).toBeVisible();

    const seekSlider = playerBar.getByRole("slider", { name: "Seek" });
    await expect(seekSlider).toBeVisible();
  });
});

test.describe("player — mobile now-playing fullscreen @smoke", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("mobile trigger opens and closes fullscreen overlay", async ({ page }) => {
    await gotoLibraryAlbum(page);

    await page.getByRole("button", { name: "Play album" }).click();

    const playerBar = page.getByRole("region", { name: "Now playing" });
    await expect(playerBar).toBeVisible();

    const nowPlayingTrigger = playerBar.getByRole("button", { name: "Open Now Playing" });
    await expect(nowPlayingTrigger).toBeVisible();
    await nowPlayingTrigger.click();

    // The fullscreen dialog is a persistent off-canvas panel toggled via
    // transform (translate-y), so assert viewport presence rather than DOM
    // visibility — the element stays mounted whether open or closed.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeInViewport();

    const transport = dialog.getByRole("button", { name: /(Pause|Play)/ });
    await expect(transport).toBeVisible();

    const closeBtn = dialog.getByRole("button", { name: "Close" });
    await closeBtn.click();

    await expect(dialog).not.toBeInViewport();

    // Focus returns to the now-playing trigger after close
    await expect(nowPlayingTrigger).toBeFocused();
  });
});

test.describe("player — queue reorder @smoke", () => {
  // Open the side queue with two known tracks (Dayvan Cowboy, then Awake) and
  // return the queue list items, so each scenario only asserts the reorder path.
  async function openQueueWithTwoTracks(page: import("@playwright/test").Page) {
    const libraryPlaylist = buildPlaylist({
      id: "queue-reorder-playlist",
      name: "Reorder Queue",
      spotifyUrl: "spotiarr://queue-reorder-playlist",
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
            id: "queue-track-1",
            name: "Dayvan Cowboy",
            playlistId: libraryPlaylist.id,
          }),
          buildTrack({
            album: "Album Two",
            artist: "Tycho",
            audioUrl: "/api/library/audio?path=/library/tycho/track-2.mp3",
            id: "queue-track-2",
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

    const queueBtn = playerBar.getByRole("button", { name: "Open queue" });
    await expect(queueBtn).toBeVisible();
    await queueBtn.click();

    const queuePanel = page.getByRole("complementary", { name: "Queue" });
    await expect(queuePanel).toBeVisible();

    const queueItems = queuePanel.getByRole("listitem");
    await expect(queueItems.first()).toContainText("Dayvan Cowboy");
    await expect(queueItems.nth(1)).toContainText("Awake");
    return queueItems;
  }

  test("native drag-and-drop reorders the second queue track above the first", async ({ page }) => {
    const queueItems = await openQueueWithTwoTracks(page);

    // Lock the native HTML5 drag path: each queue <li> is draggable, so dragging
    // "Awake" onto "Dayvan Cowboy" drives the dragstart/dragover/drop sequence the
    // QueueSidePanel listens for, exercising reorderQueue end to end.
    const awake = queueItems.filter({ hasText: "Awake" });
    const dayvanCowboy = queueItems.filter({ hasText: "Dayvan Cowboy" });

    await awake.dragTo(dayvanCowboy);

    await expect(queueItems.first()).toContainText("Awake");
    await expect(queueItems.nth(1)).toContainText("Dayvan Cowboy");
  });

  test("keyboard-accessible move-up control reorders the second queue track above the first", async ({
    page,
  }) => {
    const queueItems = await openQueueWithTwoTracks(page);

    // Accessible path: the per-row move-up button is keyboard- and screen-reader-
    // operable, unlike native drag-and-drop. It must reorder the same queue.
    await page.getByRole("button", { name: "Move Awake up" }).click();

    await expect(queueItems.first()).toContainText("Awake");
    await expect(queueItems.nth(1)).toContainText("Dayvan Cowboy");
  });
});
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
    await expect(
      playerBar.getByRole("button", { name: /Open Dayvan Cowboy by Boards of Canada/ }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Play track" }).nth(1).click();

    await expect(playerBar.getByRole("button", { name: /Open Awake by Tycho/ })).toBeVisible();
  });
});
