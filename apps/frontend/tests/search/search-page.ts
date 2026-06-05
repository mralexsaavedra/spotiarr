import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../base-page";

export class SearchPage extends BasePage {
  readonly emptyStateMessage: Locator;
  readonly allTab: Locator;

  constructor(page: Page) {
    super(page);
    this.emptyStateMessage = page.getByText(
      "Type something in the search bar to find tracks, albums, or artists",
    );
    this.allTab = page.getByRole("button", { name: "All" });
  }

  async goto(): Promise<void> {
    await super.goto("/search");
    await this.expectShellReady();
  }
}
