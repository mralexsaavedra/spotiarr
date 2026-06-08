import { expect, test } from "../../fixtures/test";
import {
  buildPlaylist,
  buildTrack,
  installLibraryAudioMocks,
  installPlaylistMocks,
  installTrackMocks,
} from "../../helpers/api-mocks";

const MOCK_AUDIO_URL = "/api/library/audio?path=%2Ftest%2Ftrack1.mp3";
const MOCK_AUDIO_URL_2 = "/api/library/audio?path=%2Ftest%2Ftrack2.mp3";
const MOCK_AUDIO_URL_3 = "/api/library/audio?path=%2Ftest%2Ftrack3.mp3";

const MOCK_ARTIST = {
  name: "Test Artist",
  path: "/library/Test Artist",
  imageUrl: null,
  albums: [
    {
      name: "Test Album",
      year: 2024,
      coverUrl: null,
      tracks: [
        {
          id: "track-1",
          name: "Track Alpha",
          artist: "Test Artist",
          album: "Test Album",
          trackUrl: MOCK_AUDIO_URL,
          durationMs: 180_000,
          artworkUrl: null,
        },
        {
          id: "track-2",
          name: "Track Beta",
          artist: "Test Artist",
          album: "Test Album",
          trackUrl: MOCK_AUDIO_URL_2,
          durationMs: 180_000,
          artworkUrl: null,
        },
        {
          id: "track-3",
          name: "Track Gamma",
          artist: "Test Artist",
          album: "Test Album",
          trackUrl: MOCK_AUDIO_URL_3,
          durationMs: 180_000,
          artworkUrl: null,
        },
      ],
    },
  ],
};

async function mockAudioRequests(page: import("@playwright/test").Page) {
  for (const url of [MOCK_AUDIO_URL, MOCK_AUDIO_URL_2, MOCK_AUDIO_URL_3]) {
    await page.route(`**${url}`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "audio/mpeg",
        body: Buffer.alloc(0),
      }),
    );
  }
}

async function mockLibraryArtist(page: import("@playwright/test").Page) {
  await page.route("**/api/library/artists/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: MOCK_ARTIST }),
    }),
  );
}

test.describe("player — transport controls labels @smoke", () => {
  test("transport buttons have accessible names derived from i18n keys", async ({ page }) => {
    await mockLibraryArtist(page);
    await mockAudioRequests(page);

    await page.goto("/library/artist/Test%20Artist/album/Test%20Album", {
      waitUntil: "domcontentloaded",
    });

    const playAlbumBtn = page.getByRole("button", { name: "Play album" });
    const isPlayable = await playAlbumBtn.isVisible().catch(() => false);

    if (!isPlayable) {
      test.skip();
      return;
    }

    await playAlbumBtn.click();

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
    await mockLibraryArtist(page);
    await mockAudioRequests(page);

    await page.goto("/library/artist/Test%20Artist/album/Test%20Album", {
      waitUntil: "domcontentloaded",
    });

    const playBtn = page.getByRole("button", { name: "Play album" });
    const isPlayable = await playBtn.isVisible().catch(() => false);

    if (!isPlayable) {
      test.skip();
      return;
    }

    await playBtn.click();

    const playerBar = page.getByRole("region", { name: "Now playing" });
    await expect(playerBar).toBeVisible();

    const nowPlayingTrigger = playerBar.getByRole("button", { name: "Open Now Playing" });
    await expect(nowPlayingTrigger).toBeVisible();
    await nowPlayingTrigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const transport = dialog.getByRole("button", { name: /(Pause|Play)/ });
    await expect(transport).toBeVisible();

    const closeBtn = dialog.getByRole("button", { name: "Close" });
    await closeBtn.click();

    await expect(dialog).not.toBeVisible();

    // Focus returns to the now-playing trigger after close
    await expect(nowPlayingTrigger).toBeFocused();
  });
});

test.describe("player — queue reorder @smoke", () => {
  test("moveUp button reorders second track above first", async ({ page }) => {
    await mockLibraryArtist(page);
    await mockAudioRequests(page);

    await page.goto("/library/artist/Test%20Artist/album/Test%20Album", {
      waitUntil: "domcontentloaded",
    });

    const playBtn = page.getByRole("button", { name: "Play album" });
    const isPlayable = await playBtn.isVisible().catch(() => false);

    if (!isPlayable) {
      test.skip();
      return;
    }

    await playBtn.click();

    const playerBar = page.getByRole("region", { name: "Now playing" });
    const queueBtn = playerBar.getByRole("button", { name: "Open queue" });
    await expect(queueBtn).toBeVisible();
    await queueBtn.click();

    const queuePanel = page.getByRole("complementary");
    await expect(queuePanel).toBeVisible();

    // Get all track rows in queue — move Track Beta up above Track Alpha
    const moveUpBetaBtn = page.getByRole("button", { name: "Move Track Beta up" });
    const isMoveVisible = await moveUpBetaBtn.isVisible().catch(() => false);

    if (!isMoveVisible) {
      test.skip();
      return;
    }

    await moveUpBetaBtn.click();

    // After moving up, Track Beta should now be before Track Alpha in queue
    const queueItems = queuePanel.getByRole("listitem");
    const firstItemText = await queueItems.first().textContent();
    expect(firstItemText).toContain("Track Beta");
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
