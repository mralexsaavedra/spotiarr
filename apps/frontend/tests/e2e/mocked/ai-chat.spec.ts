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

interface MockChatMessage {
  id: string;
  role: "user" | "assistant";
  content: { key: string; params?: Record<string, unknown> };
  playlistId: string | null;
  errorCode: string | null;
  createdAt: number;
}

function userMessage(id: string, prompt: string, createdAt: number): MockChatMessage {
  return {
    id,
    role: "user",
    content: { key: "aiChat.userPrompt", params: { prompt } },
    playlistId: null,
    errorCode: null,
    createdAt,
  };
}

function assistantDoneMessage(
  id: string,
  count: number,
  playlistId: string,
  createdAt: number,
): MockChatMessage {
  return {
    id,
    role: "assistant",
    content: { key: "aiChat.assistantDone", params: { count } },
    playlistId,
    errorCode: null,
    createdAt,
  };
}

function fulfillJson(route: import("@playwright/test").Route, data: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
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

    await expect(page.getByText(/tracks added/i)).toBeVisible();
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

    await expect(page.getByText(/Settings/i)).toBeVisible();
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

  test("history persistence: loads the saved transcript with an active playlist link on mount", async ({
    page,
  }) => {
    const PLAYLIST_ID = "pl-history-1";

    await page.route("**/api/ai/chat/messages", async (route) => {
      if (route.request().method() === "DELETE") {
        await fulfillJson(route, { data: { deleted: 2 } });
        return;
      }
      await fulfillJson(route, {
        data: {
          messages: [
            userMessage("u1", "jazz for studying", 1),
            assistantDoneMessage("a1", 5, PLAYLIST_ID, 2),
          ],
        },
      });
    });

    await page.route("**/api/playlist", async (route) => {
      await fulfillJson(route, { data: [{ id: PLAYLIST_ID, name: "AI mix" }] });
    });

    await page.goto("/chat", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("jazz for studying")).toBeVisible();
    await expect(page.getByText(/Created playlist with 5 tracks/i)).toBeVisible();

    const link = page.getByRole("link", { name: /View playlist/i });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toContain(PLAYLIST_ID);
    expect(href).toContain("mode=library");
  });

  test("conversation threading: renders multiple prompt/response pairs in order", async ({
    page,
  }) => {
    await page.route("**/api/ai/chat/messages", async (route) => {
      if (route.request().method() === "DELETE") {
        await fulfillJson(route, { data: { deleted: 4 } });
        return;
      }
      await fulfillJson(route, {
        data: {
          messages: [
            userMessage("u1", "first prompt", 1),
            assistantDoneMessage("a1", 3, "pl-1", 2),
            userMessage("u2", "second prompt", 3),
            assistantDoneMessage("a2", 7, "pl-2", 4),
          ],
        },
      });
    });

    await page.route("**/api/playlist", async (route) => {
      await fulfillJson(route, { data: [{ id: "pl-1" }, { id: "pl-2" }] });
    });

    await page.goto("/chat", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("first prompt")).toBeVisible();
    await expect(page.getByText("second prompt")).toBeVisible();
    await expect(page.getByText(/Created playlist with 3 tracks/i)).toBeVisible();
    await expect(page.getByText(/Created playlist with 7 tracks/i)).toBeVisible();

    // User bubbles must render in chronological order (oldest first).
    await expect(page.getByText(/prompt$/)).toHaveCount(2); // settle before the snapshot below
    const promptTexts = await page.getByText(/prompt$/).allTextContents();
    expect(promptTexts).toEqual(["first prompt", "second prompt"]);
  });

  test("clear conversation: confirm modal deletes the transcript and shows the empty state", async ({
    page,
  }) => {
    let cleared = false;

    await page.route("**/api/ai/chat/messages", async (route) => {
      if (route.request().method() === "DELETE") {
        cleared = true;
        await fulfillJson(route, { data: { deleted: 1 } });
        return;
      }
      await fulfillJson(route, {
        data: { messages: cleared ? [] : [userMessage("u1", "drum and bass set", 1)] },
      });
    });

    await page.goto("/chat", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("drum and bass set")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    // Opening the modal must NOT mutate anything yet.
    await page.getByRole("button", { name: /Clear conversation/i }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Cancel closes the modal and keeps the transcript.
    await dialog.getByRole("button", { name: /^Cancel$/ }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("drum and bass set")).toBeVisible();

    // Confirming the destructive action clears the transcript.
    await page.getByRole("button", { name: /Clear conversation/i }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: /^Delete$/ })
      .click();

    await expect(page.getByText("drum and bass set")).toBeHidden();
    await expect(page.getByText(/No conversation yet/i)).toBeVisible();
  });
});

test.describe("Mocked AI Chat playlist link navigation", () => {
  // Clicking the link mounts the playlist detail view, which fires its own
  // (here unmocked) requests; allow them so the navigation assertion can run.
  test.use({ allowUnhandledRequests: true });

  test("clicking 'View playlist' navigates to the playlist detail in library mode", async ({
    page,
  }) => {
    const PLAYLIST_ID = "pl-nav-9";

    await page.route("**/api/ai/chat/messages", async (route) => {
      if (route.request().method() === "DELETE") {
        await fulfillJson(route, { data: { deleted: 2 } });
        return;
      }
      await fulfillJson(route, {
        data: {
          messages: [
            userMessage("u1", "lofi beats", 1),
            assistantDoneMessage("a1", 4, PLAYLIST_ID, 2),
          ],
        },
      });
    });

    await page.route("**/api/playlist", async (route) => {
      await fulfillJson(route, { data: [{ id: PLAYLIST_ID, name: "AI mix" }] });
    });

    await page.goto("/chat", { waitUntil: "domcontentloaded" });

    const link = page.getByRole("link", { name: /View playlist/i });
    await expect(link).toBeVisible();
    await link.click();

    await expect(page).toHaveURL(/pl-nav-9\?mode=library/);
  });
});
