import { expect, test } from "@playwright/test";

// Real-stack download trigger contract.
//
// The seeded track `real-history-track-1` starts as Completed. Retrying it
// exercises the real HTTP -> use-case -> repository -> BullMQ path:
// RetryTrackDownloadUseCase resets the track to New, persists it to the real
// SQLite database, and enqueues a search job onto the real Redis-backed queue.
//
// The Playwright real-stack harness starts the queues but NOT the workers, so
// the enqueued job is never drained and the reset status is observable
// deterministically. This is the closest end-to-end coverage of the download
// trigger achievable without external Spotify/yt-dlp dependencies.

const TRACK_ID = "real-history-track-1";
const TRACK_URL = "https://open.spotify.com/track/real-history-track-1";

test.describe("Real-stack download enqueue", () => {
  test("retrying a completed track resets it and enqueues a new download job", async ({
    request,
  }) => {
    const before = await request.get("/api/playlist/status");
    expect(before.ok()).toBeTruthy();
    const beforeBody = (await before.json()) as {
      trackStatusMap: Record<string, string>;
    };
    expect(beforeBody.trackStatusMap[TRACK_URL]).toBe("completed");

    const retry = await request.post(`/api/track/${TRACK_ID}/retry`);
    expect(retry.status()).toBe(204);

    await expect
      .poll(async () => {
        const status = await request.get("/api/playlist/status");
        const body = (await status.json()) as {
          trackStatusMap: Record<string, string>;
        };
        return body.trackStatusMap[TRACK_URL];
      })
      .toBe("new");
  });
});
