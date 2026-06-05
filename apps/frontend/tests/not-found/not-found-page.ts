import { type Locator, type Page } from "@playwright/test";
import { BasePage } from "../base-page";

export class NotFoundPage extends BasePage {
  readonly title: Locator;
  readonly description: Locator;
  readonly goHomeButton: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.getByRole("heading", { name: "Page Not Found" });
    this.description = page.getByText(
      "The page you are looking for does not exist or has been moved.",
    );
    this.goHomeButton = page.getByRole("button", { name: "Go Home" });
  }

  async goto(): Promise<void> {
    await super.goto("/does-not-exist");
    await this.expectShellReady();
  }

  async goHome(): Promise<void> {
    await this.goHomeButton.click();
  }
}
