import { expect, test } from "@playwright/test";

test.describe("Real-stack library and history pages", () => {
  test("renders seeded library artist and album data from the local downloads folder", async ({
    page,
  }) => {
    await page.goto("/library/artist/Tycho", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Tycho", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Album Epoch by Tycho/i })).toBeVisible();

    await page.goto("/library/artist/Tycho/album/Epoch", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: "Epoch" })).toBeVisible();
    await expect(page.getByText("A Walk")).toBeVisible();
  });

  test("renders seeded download history and links managed entries to local playlist detail", async ({
    page,
  }) => {
    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

    await expect(
      page.getByRole("heading", { name: "Download History", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("heading", { name: "Download History", exact: true })
      .scrollIntoViewIfNeeded();
    await expect(page.getByText("Managed Archive Mix")).toBeVisible();

    await page.getByText("Managed Archive Mix").click();

    await expect(page).toHaveURL("/playlist/real-history-playlist");
    await expect(page.getByRole("heading", { name: "Managed Archive Mix" })).toBeVisible();
    await expect(page.getByText("A Walk")).toBeVisible();
  });
});
