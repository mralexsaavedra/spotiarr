import { expect, test } from "@playwright/test";

test.describe("Real-stack health and routing", () => {
  test("serves the backend health endpoint from the seeded database", async ({ request }) => {
    const response = await request.get("/api/health");

    expect(response.ok()).toBeTruthy();
    await expect(response.json()).resolves.toMatchObject({ status: "ok" });
  });

  test("serves the SPA fallback for a direct client-route request", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist", {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Page Not Found" })).toBeVisible();
  });
});
