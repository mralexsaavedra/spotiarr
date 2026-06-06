import { expect, test } from "../../fixtures/test";
import { mockSettingsPageData, mockSpotifyAuthStatus } from "../../helpers/api-mocks";

test.describe("Mocked settings flows", () => {
  test("renders the disconnected Spotify auth state from mocked responses", async ({ page }) => {
    await mockSettingsPageData(page);
    await mockSpotifyAuthStatus(page, { authenticated: false, hasRefreshToken: false });

    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Spotify Authentication")).toBeVisible();
    await expect(page.getByText("Not Connected")).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect with Spotify" })).toBeVisible();
    await expect(page.getByText("Why connect?")).toBeVisible();
  });

  test("renders mocked settings metadata and current values", async ({ page }) => {
    await mockSettingsPageData(page, {
      settings: [
        { key: "UI_LANGUAGE", value: "en", updatedAt: new Date(0).toISOString() },
        { key: "FORMAT", value: "m4a", updatedAt: new Date(0).toISOString() },
      ],
    });
    await mockSpotifyAuthStatus(page, { authenticated: false, hasRefreshToken: false });

    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("General")).toBeVisible();
    await expect(page.getByLabel("Interface Language")).toHaveValue("en");
    await expect(page.getByLabel("Audio format")).toHaveValue("m4a");
    await expect(page.getByRole("button", { name: "Reset to Defaults" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save Settings" })).toBeVisible();
  });
});
