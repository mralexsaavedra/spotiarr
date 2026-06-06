import type { FollowedArtist } from "@spotiarr/shared";
import { expect, test } from "../../fixtures/test";
import { installFeedMocks } from "../../helpers/api-mocks";

const followedArtists: FollowedArtist[] = [
  {
    id: "artist-1",
    name: "Daft Punk",
    image: null,
    spotifyUrl: "https://open.spotify.com/artist/4tZwfgrHOc3mvqYlEYSvVi",
  },
  {
    id: "artist-2",
    name: "Justice",
    image: null,
    spotifyUrl: "https://open.spotify.com/artist/1gR0gsQYfi6joyO1dlp76N",
  },
];

test.describe("Mocked artists flows", () => {
  test("renders followed artists from mocked feed responses", async ({ page }) => {
    await installFeedMocks(page, { followedArtists, releases: [] });

    await page.goto("/artists", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Followed Artists" })).toBeVisible();
    await expect(page.getByText("Daft Punk")).toBeVisible();
    await expect(page.getByText("Justice")).toBeVisible();
    await expect(page.getByText("Artist").first()).toBeVisible();
  });

  test("renders the artist search fallback when no mocked artist matches the filter", async ({
    page,
  }) => {
    await installFeedMocks(page, { followedArtists, releases: [] });

    await page.goto("/artists", { waitUntil: "domcontentloaded" });
    await page.getByPlaceholder("Filter artists...").fill("missing artist");

    await expect(page.getByText("No followed artists found.")).toBeVisible();
  });
});
