import { expect, test } from "../../fixtures/test";
import {
  buildLibraryAlbum,
  buildLibraryArtist,
  buildLibraryTrack,
  installLibraryMocks,
} from "../../helpers/api-mocks";

const albumArtist = buildLibraryArtist({
  name: "Tycho",
  image: undefined,
  albums: [
    buildLibraryAlbum({
      artist: "Tycho",
      image: undefined,
      name: "Epoch",
      path: "/library/artists/tycho/epoch",
      tracks: [
        buildLibraryTrack({
          album: "Epoch",
          artist: "Tycho",
          filePath: "/library/artists/tycho/epoch/01 Glider.mp3",
          name: "Glider",
        }),
      ],
      year: 2016,
    }),
  ],
});

test.describe("Mocked library detail flows", () => {
  test("renders the library artist album grid with mocked album cards", async ({ page }) => {
    await installLibraryMocks(page, {
      artistDetail: albumArtist,
      artists: [albumArtist],
    });

    await page.goto("/library/artist/Tycho", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Tycho" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Album Epoch by Tycho, 2016, 1 tracks/i }),
    ).toBeVisible();
  });

  test("shows the album loading state until the mocked artist detail payload resolves", async ({
    page,
  }) => {
    const detailGate = Promise.withResolvers<void>();

    await installLibraryMocks(page, {
      artistDetail: albumArtist,
      artists: [albumArtist],
      gates: {
        artistDetail: detailGate.promise,
      },
    });

    await page.goto("/library/artist/Tycho/album/Epoch", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Loading album details...")).toBeVisible();

    detailGate.resolve();

    await expect(page.getByRole("heading", { name: "Epoch" })).toBeVisible();
    await expect(page.getByText("Glider")).toBeVisible();
  });

  test("renders the not-found state when the requested album is absent from the artist payload", async ({
    page,
  }) => {
    await installLibraryMocks(page, {
      artistDetail: albumArtist,
      artists: [albumArtist],
    });

    await page.goto("/library/artist/Tycho/album/Missing%20Album", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.getByText("Album not found")).toBeVisible();
    await expect(page.getByText("Could not find this album in your library.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to artist" })).toBeVisible();
  });
});
