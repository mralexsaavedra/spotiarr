import { expect, type Locator, type Page } from "@playwright/test";

export class BasePage {
  readonly headerSearchInput: Locator;

  constructor(protected readonly page: Page) {
    this.headerSearchInput = page.getByPlaceholder("Search or paste link...");
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path, { waitUntil: "domcontentloaded" });
  }

  async expectShellReady(): Promise<void> {
    await expect(this.headerSearchInput).toBeVisible();
  }
}
