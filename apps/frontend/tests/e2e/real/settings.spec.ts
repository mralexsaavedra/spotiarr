import { expect, test } from "@playwright/test";

test.describe("Real-stack settings page", () => {
  test("renders a connected Spotify auth state from seeded tokens", async ({ page }) => {
    const response = await page.goto("/settings", { waitUntil: "domcontentloaded" });

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("Connected", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Disconnect Spotify" })).toBeVisible();
  });

  test("renders seeded settings values from the real database", async ({ page }) => {
    await page.goto("/settings", { waitUntil: "domcontentloaded" });

    await expect(page.getByLabel("Interface Language")).toHaveValue("en");
    await expect(page.getByLabel("Audio format")).toHaveValue("m4a");
    await expect(page.getByRole("button", { name: "Save Settings" })).toBeVisible();
  });
});
