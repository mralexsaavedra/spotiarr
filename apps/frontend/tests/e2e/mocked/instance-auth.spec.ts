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

test.describe("SESSION EXPIRED re-lock", () => {
  /**
   * Approach: two-phase route handlers.
   * Phase 1 (initial load): session 200 + artists 200 → app shows Library heading.
   * Phase 2 (reload): session 200 gates artists until session response is sent,
   * then artists returns 401 → httpClient fires onUnauthorized → TokenGate
   * re-locks with sessionExpired banner.
   *
   * Limitation: requires a page.reload() to trigger a second round of queries,
   * because useAuthSessionQuery uses staleTime:Infinity and won't refetch
   * without a hard navigation.
   */
  test("shows session-expired banner when a mid-session API call returns 401", async ({ page }) => {
    let loadPhase: "initial" | "reload" = "initial";
    let resolveSessionSent!: () => void;
    const sessionSentGate = new Promise<void>((resolve) => {
      resolveSessionSent = resolve;
    });

    await page.route("**/api/auth/session", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ tokenRequired: false }),
      });
      if (loadPhase === "reload") {
        resolveSessionSent();
      }
    });

    await page.route("**/api/library/artists", async (route) => {
      if (loadPhase === "initial") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            data: [buildLibraryArtist({ name: "Library Artist", image: null })],
          }),
        });
      } else {
        await sessionSentGate;
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "unauthorized" }),
        });
      }
    });

    await page.route("**/api/library/stats", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            totalArtists: 1,
            totalAlbums: 1,
            totalTracks: 1,
            totalSize: 4096,
            lastScannedAt: null,
          },
        }),
      });
    });

    await page.route("**/api/library/artwork-backfill/status", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            runId: null,
            status: "idle",
            phase: null,
            totals: 0,
            processed: 0,
            skippedExisting: 0,
            written: 0,
            failed: 0,
            externalCalls: 0,
            lastCheckpoint: null,
            rateLimitUntil: null,
            updatedAt: null,
          },
        }),
      });
    });

    await installPlaylistMocks(page, { playlists: [] });

    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Library", exact: true })).toBeVisible();

    loadPhase = "reload";
    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(
      page.getByText("Your session has expired. Please enter the token again."),
    ).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("heading", { name: "Instance Protected" })).toBeVisible();
  });
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
