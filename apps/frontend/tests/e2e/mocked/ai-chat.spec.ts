import { expect, test } from "../../fixtures/test";

const JOB_ID = "test-job-abc-123";

function buildSseEvent(eventName: string, data: object): string {
  return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

function buildAiProgressEvents(jobId: string): string {
  return (
    ": connected\n\n" +
    buildSseEvent("ai-playlist-progress", { jobId, stage: "llm", progress: 0.2 }) +
    buildSseEvent("ai-playlist-progress", { jobId, stage: "validating", progress: 0.5 }) +
    buildSseEvent("ai-playlist-progress", { jobId, stage: "saving", progress: 0.8 }) +
    buildSseEvent("ai-playlist-progress", {
      jobId,
      stage: "done",
      progress: 1,
      resolvedCount: 5,
      droppedTitles: [],
    })
  );
}

function buildAiErrorEvents(jobId: string): string {
  return (
    ": connected\n\n" +
    buildSseEvent("ai-playlist-progress", {
      jobId,
      stage: "error",
      progress: 0,
      error: { code: "provider-misconfig", message: "Missing API key" },
    })
  );
}

test.describe("Mocked AI Chat flows", () => {
  test("happy path: prompt submit triggers progress stages and shows playlist created", async ({
    page,
  }) => {
    await page.route("**/api/events", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "cache-control": "no-cache", connection: "keep-alive" },
        body: buildAiProgressEvents(JOB_ID),
      });
    });

    await page.route("**/api/ai/chat/generate", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify({ data: { jobId: JOB_ID } }),
        });
        return;
      }
      await route.abort("failed");
    });

    await page.route("**/api/playlist", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto("/chat", { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    const textarea = page.getByRole("textbox", { name: /Describe the playlist/i });
    await expect(textarea).toBeVisible();

    const sendBtn = page.getByRole("button", { name: /Generate/i });
    await expect(sendBtn).toBeDisabled();

    await textarea.fill("jazz for a rainy afternoon");
    await expect(sendBtn).toBeEnabled();

    await sendBtn.click();

    await expect(page.getByText("jazz for a rainy afternoon").first()).toBeVisible();

    await expect(page.getByText(/tracks added/i)).toBeVisible({ timeout: 5000 });
  });

  test("error path: provider-misconfig shows settings redirect message", async ({ page }) => {
    await page.route("**/api/events", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "cache-control": "no-cache", connection: "keep-alive" },
        body: buildAiErrorEvents(JOB_ID),
      });
    });

    await page.route("**/api/ai/chat/generate", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 202,
          contentType: "application/json",
          body: JSON.stringify({ data: { jobId: JOB_ID } }),
        });
        return;
      }
      await route.abort("failed");
    });

    await page.goto("/chat", { waitUntil: "domcontentloaded" });

    const textarea = page.getByRole("textbox", { name: /Describe the playlist/i });
    await textarea.fill("metal classics");

    const sendBtn = page.getByRole("button", { name: /Generate/i });
    await sendBtn.click();

    await expect(page.getByText(/Settings/i)).toBeVisible({ timeout: 5000 });
  });

  test("empty prompt guard: send button is disabled when textarea is empty", async ({ page }) => {
    await page.route("**/api/events", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/event-stream",
        headers: { "cache-control": "no-cache", connection: "keep-alive" },
        body: ": connected\n\n",
      });
    });

    await page.goto("/chat", { waitUntil: "domcontentloaded" });

    const sendBtn = page.getByRole("button", { name: /Generate/i });
    await expect(sendBtn).toBeDisabled();

    const textarea = page.getByRole("textbox", { name: /Describe the playlist/i });
    await textarea.fill("  ");
    await expect(sendBtn).toBeDisabled();

    await textarea.fill("actual content");
    await expect(sendBtn).toBeEnabled();
  });
});
