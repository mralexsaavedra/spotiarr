import { test, expect } from "../../fixtures/test";
import {
  buildLibraryArtist,
  mockAuthSession,
  mockAuthSessionUnauthorized,
  mockAuthSessionError,
  mockAuthUnlock,
  mockLockedThenUnlock,
  installLibraryMocks,
  installPlaylistMocks,
} from "../../helpers/api-mocks";

test.use({
  ignoredConsoleErrors: [
    "Failed to load resource: the server responded with a status of 401",
    "Failed to load resource: the server responded with a status of 500",
  ],
});

test.describe("Instance auth — TokenGate", () => {
  test("OPEN mode: renders app shell when session returns tokenRequired:false", async ({
    page,
  }) => {
    await mockAuthSession(page, { tokenRequired: false });
    await installLibraryMocks(page, {
      artists: [buildLibraryArtist({ name: "Library Artist", image: null })],
    });
    await installPlaylistMocks(page, { playlists: [] });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Instance Protected" })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  });

  test("LOCKED: shows unlock form and hides app content when session returns 401", async ({
    page,
  }) => {
    await mockAuthSessionUnauthorized(page);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Instance Protected" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Library", exact: true })).not.toBeVisible();
  });

  test("UNLOCK flow: submitting a valid token unlocks and shows the app", async ({ page }) => {
    await mockLockedThenUnlock(page);
    await installLibraryMocks(page, {
      artists: [buildLibraryArtist({ name: "Library Artist", image: null })],
    });
    await installPlaylistMocks(page, { playlists: [] });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Instance Protected" })).toBeVisible();

    await page.getByLabel("Access Token").fill("correct-token");
    await page.getByRole("button", { name: "Unlock" }).click();

    await expect(page.getByRole("heading", { name: "Instance Protected" })).not.toBeVisible();
    await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();
  });

  test("WRONG token: shows error message and keeps gate visible when unlock returns 401", async ({
    page,
  }) => {
    await mockAuthSessionUnauthorized(page);
    await mockAuthUnlock(page, { status: 401 });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Instance Protected" })).toBeVisible();

    await page.getByLabel("Access Token").fill("wrong-token");
    await page.getByRole("button", { name: "Unlock" }).click();

    await expect(page.getByText("Invalid token. Please try again.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Instance Protected" })).toBeVisible();
  });

  test("CONNECTION error: shows cannot-connect card with Retry button after session errors", async ({
    page,
  }) => {
    test.slow();

    await mockAuthSessionError(page, 500);

    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Cannot connect" })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });
});
