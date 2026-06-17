import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("feedSyncJob interval guard", () => {
  const getSyncState = vi.fn();
  const feedRepository = { getSyncState };

  const settingsService = {
    getNumber: vi.fn((key: string) => {
      if (key === "RELEASES_SYNC_INTERVAL_MINUTES") return Promise.resolve(60);
      return Promise.resolve(0);
    }),
  };

  const feedSyncAddMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.resetModules();
    vi.doMock("../../container", () => ({
      getContainer: vi.fn(() => ({ settingsService, feedRepository })),
    }));
    vi.doMock("../setup/queues", () => ({
      getFeedSyncQueue: () => ({ add: feedSyncAddMock }),
    }));
    // Default: sync state idle
    getSyncState.mockResolvedValue({ status: "idle" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock("../../container");
    vi.doUnmock("../setup/queues");
  });

  it("enqueues a feed-sync job on the first execution", async () => {
    vi.setSystemTime(new Date("2026-02-01T00:00:00Z"));
    const { feedSyncJob } = await import("./feed-sync.job");

    await feedSyncJob.execute();

    expect(feedSyncAddMock).toHaveBeenCalledOnce();
    expect(feedSyncAddMock).toHaveBeenCalledWith(
      "feed-sync",
      {},
      expect.objectContaining({ jobId: expect.stringContaining("feed-sync-") }),
    );
  });

  it("skips enqueue when not enough time has elapsed since last run", async () => {
    vi.setSystemTime(new Date("2026-02-01T01:00:00Z"));
    const { feedSyncJob } = await import("./feed-sync.job");

    await feedSyncJob.execute();
    expect(feedSyncAddMock).toHaveBeenCalledTimes(1);

    // Advance less than 60 minutes
    vi.advanceTimersByTime(10 * 60_000);
    await feedSyncJob.execute();

    expect(feedSyncAddMock).toHaveBeenCalledTimes(1);
  });

  it("enqueues again after the full interval has elapsed", async () => {
    vi.setSystemTime(new Date("2026-02-01T02:00:00Z"));
    const { feedSyncJob } = await import("./feed-sync.job");

    await feedSyncJob.execute();
    expect(feedSyncAddMock).toHaveBeenCalledTimes(1);

    // Advance exactly 60 minutes
    vi.advanceTimersByTime(60 * 60_000);
    await feedSyncJob.execute();

    expect(feedSyncAddMock).toHaveBeenCalledTimes(2);
  });

  it("skips enqueue when sync is already running", async () => {
    vi.setSystemTime(new Date("2026-02-01T03:00:00Z"));
    getSyncState.mockResolvedValue({ status: "running" });
    const { feedSyncJob } = await import("./feed-sync.job");

    await feedSyncJob.execute();

    expect(feedSyncAddMock).not.toHaveBeenCalled();
  });

  it("swallows errors and does not throw", async () => {
    vi.setSystemTime(new Date("2026-02-01T04:00:00Z"));
    settingsService.getNumber.mockRejectedValueOnce(new Error("settings failure"));
    const { feedSyncJob } = await import("./feed-sync.job");

    await expect(feedSyncJob.execute()).resolves.not.toThrow();
  });

  it("uses 60 minutes as safe interval when configured value is 0 or negative", async () => {
    vi.setSystemTime(new Date("2026-02-01T05:00:00Z"));
    settingsService.getNumber.mockResolvedValue(0);
    const { feedSyncJob } = await import("./feed-sync.job");

    await feedSyncJob.execute();
    expect(feedSyncAddMock).toHaveBeenCalledTimes(1);

    // Advance less than 60 minutes — guard should block
    vi.advanceTimersByTime(30 * 60_000);
    await feedSyncJob.execute();

    expect(feedSyncAddMock).toHaveBeenCalledTimes(1);
  });
});
