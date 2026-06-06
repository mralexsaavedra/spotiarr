import { expect, test } from "../../fixtures/test";
import {
  buildLibraryArtist,
  buildPlaylist,
  installLibraryMocks,
  installPlaylistMocks,
} from "../../helpers/api-mocks";

test.describe("Mocked home flows", () => {
  test("renders the home heading with mocked library artists and playlists", async ({ page }) => {
    await installLibraryMocks(page, {
      artists: [buildLibraryArtist({ name: "Tycho", image: null })],
    });
    await installPlaylistMocks(page, {
      playlists: [buildPlaylist({ id: "playlist-home", name: "Sunrise Set" })],
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Library" })).toBeVisible();
    await expect(page.getByText("Your downloaded music collection")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Playlists" })).toBeVisible();
    await expect(page.getByText("Sunrise Set")).toBeVisible();
    await expect(page.getByText("Tycho")).toBeVisible();
  });

  test("renders the empty state when mocked library and playlist payloads are empty", async ({
    page,
  }) => {
    await installLibraryMocks(page, {
      artists: [],
      stats: {
        totalArtists: 0,
        totalAlbums: 0,
        totalTracks: 0,
        totalSize: 0,
        lastScannedAt: null,
      },
    });
    await installPlaylistMocks(page, { playlists: [] });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Library is empty")).toBeVisible();
    await expect(
      page.getByText("Scan or rescan your downloads folder to populate your library and artwork."),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Scan Now" })).toBeVisible();
  });

  test("shows a loading state while mocked home data is still in flight", async ({ page }) => {
    const libraryGate = Promise.withResolvers<void>();

    await installLibraryMocks(page, {
      artists: [buildLibraryArtist({ name: "Boards of Canada", image: null })],
      gates: {
        artists: libraryGate.promise,
        stats: libraryGate.promise,
      },
    });
    await installPlaylistMocks(page, { playlists: [] });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("status", { name: "Loading" })).toBeVisible();

    libraryGate.resolve();

    await expect(page.getByText("Boards of Canada")).toBeVisible();
  });
});
