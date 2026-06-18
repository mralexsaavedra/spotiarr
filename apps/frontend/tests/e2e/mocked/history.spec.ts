import { expect, test } from "../../fixtures/test";
import {
  buildHistoryItem,
  buildPlaylist,
  buildTrack,
  installHistoryMocks,
  installPlaylistMocks,
  installTrackMocks,
} from "../../helpers/api-mocks";

const historyItem = buildHistoryItem({
  playlistId: "history-playlist-1",
  playlistName: "Archive Mix",
  playlistSpotifyUrl: "https://open.spotify.com/playlist/archive-mix",
});

test.describe("Mocked history flows", () => {
  test("opens preview detail from history when the playlist is not yet saved locally", async ({
    page,
  }) => {
    await installHistoryMocks(page, { downloads: [historyItem] });
    await installPlaylistMocks(page, {
      playlists: [],
      preview: {
        coverUrl: null,
        description: "Recovered from history.",
        name: historyItem.playlistName,
        owner: "Spotiarr",
        ownerUrl: "https://open.spotify.com/user/spotiarr",
        totalTracks: 1,
        tracks: [
          {
            album: "Recovered Album",
            artists: [{ name: "Recovered Artist" }],
            duration: 210_000,
            name: "Recovered Track",
            trackUrl: "https://open.spotify.com/track/recovered-track",
          },
        ],
        type: "playlist",
      },
    });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Download History" })).toBeVisible();
    await expect(page.getByText("Archive Mix")).toBeVisible();

    await page.getByText("Archive Mix").click();

    await expect(page).toHaveURL(/\/preview\?url=/);
    await expect(page.getByRole("heading", { name: "Archive Mix" })).toBeVisible();
    await expect(page.getByText("Recovered Track")).toBeVisible();
  });

  test("opens managed playlist detail from history when the playlist already exists locally", async ({
    page,
  }) => {
    const managedPlaylist = buildPlaylist({
      id: "managed-history-playlist",
      name: "Archive Mix",
      spotifyUrl: historyItem.playlistSpotifyUrl,
      tracks: [],
    });

    await installHistoryMocks(page, { downloads: [historyItem] });
    await installPlaylistMocks(page, { playlists: [managedPlaylist] });
    await installTrackMocks(page, {
      tracksByPlaylistId: {
        [managedPlaylist.id]: [
          buildTrack({
            album: "Offline Album",
            id: "managed-track-1",
            name: "Stored Track",
            playlistId: managedPlaylist.id,
            trackUrl: "https://open.spotify.com/track/stored-track",
          }),
        ],
      },
    });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await page.getByText("Archive Mix").click();

    await expect(page).toHaveURL(`/playlist/${managedPlaylist.id}`);
    await expect(page.getByRole("heading", { name: "Archive Mix" })).toBeVisible();
    await expect(
      page.getByText("Download tracks in this playlist to start local playback."),
    ).toBeVisible();
  });

  test("renders the empty history state when no mocked downloads exist", async ({ page }) => {
    await installHistoryMocks(page, { downloads: [] });
    await installPlaylistMocks(page, { playlists: [] });

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("No download history yet")).toBeVisible();
    await expect(page.getByText("Completed downloads will appear here.")).toBeVisible();
  });

  test("/history redirects to /dashboard and shows Download History section", async ({ page }) => {
    await installHistoryMocks(page, { downloads: [historyItem] });
    await installPlaylistMocks(page, { playlists: [] });

    await page.goto("/history", { waitUntil: "domcontentloaded" });

    await expect(page).toHaveURL("/dashboard");
    await expect(page.getByRole("heading", { name: "Download History" })).toBeVisible();
  });
});
