import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("catalogSyncJob interval guard", () => {
  const getCatalogSyncState = vi.fn();
  const getSyncState = vi.fn();
  const feedRepository = { getCatalogSyncState, getSyncState };

  const settingsService = {
    getNumber: vi.fn((key: string) => {
      if (key === "CATALOG_SYNC_INTERVAL_HOURS") return Promise.resolve(6);
      return Promise.resolve(0);
    }),
  };

  const catalogSyncAddMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.resetModules();
    vi.doMock("../../container", () => ({
      getContainer: vi.fn(() => ({ settingsService, feedRepository })),
    }));
    vi.doMock("../setup/queues", () => ({
      getCatalogSyncQueue: () => ({ add: catalogSyncAddMock }),
    }));
    // Default: both sync states idle
    getCatalogSyncState.mockResolvedValue({ status: "idle" });
    getSyncState.mockResolvedValue({ status: "idle" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock("../../container");
    vi.doUnmock("../setup/queues");
  });

  it("enqueues a catalog-sync job on the first execution", async () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { catalogSyncJob } = await import("./catalog-sync.job");

    await catalogSyncJob.execute();

    expect(catalogSyncAddMock).toHaveBeenCalledOnce();
    expect(catalogSyncAddMock).toHaveBeenCalledWith(
      "catalog-sync",
      {},
      expect.objectContaining({ jobId: expect.stringContaining("catalog-sync-") }),
    );
  });

  it("skips enqueue when not enough time has elapsed since last run", async () => {
    vi.setSystemTime(new Date("2026-01-01T01:00:00Z"));
    const { catalogSyncJob } = await import("./catalog-sync.job");

    await catalogSyncJob.execute();
    expect(catalogSyncAddMock).toHaveBeenCalledTimes(1);

    // Advance less than 6 hours
    vi.advanceTimersByTime(60_000);
    await catalogSyncJob.execute();

    expect(catalogSyncAddMock).toHaveBeenCalledTimes(1);
  });

  it("enqueues again after the full interval has elapsed", async () => {
    vi.setSystemTime(new Date("2026-01-01T02:00:00Z"));
    const { catalogSyncJob } = await import("./catalog-sync.job");

    await catalogSyncJob.execute();
    expect(catalogSyncAddMock).toHaveBeenCalledTimes(1);

    // Advance exactly 6 hours
    vi.advanceTimersByTime(6 * 60 * 60_000);
    await catalogSyncJob.execute();

    expect(catalogSyncAddMock).toHaveBeenCalledTimes(2);
  });

  it("skips enqueue when catalog sync is already running", async () => {
    vi.setSystemTime(new Date("2026-01-01T03:00:00Z"));
    getCatalogSyncState.mockResolvedValue({ status: "running" });
    const { catalogSyncJob } = await import("./catalog-sync.job");

    await catalogSyncJob.execute();

    expect(catalogSyncAddMock).not.toHaveBeenCalled();
  });

  it("skips enqueue when feed sync is already running", async () => {
    vi.setSystemTime(new Date("2026-01-01T04:00:00Z"));
    getSyncState.mockResolvedValue({ status: "running" });
    const { catalogSyncJob } = await import("./catalog-sync.job");

    await catalogSyncJob.execute();

    expect(catalogSyncAddMock).not.toHaveBeenCalled();
  });

  it("swallows errors and does not throw", async () => {
    vi.setSystemTime(new Date("2026-01-01T05:00:00Z"));
    settingsService.getNumber.mockRejectedValueOnce(new Error("settings failure"));
    const { catalogSyncJob } = await import("./catalog-sync.job");

    await expect(catalogSyncJob.execute()).resolves.not.toThrow();
  });

  it("uses 6 hours as safe interval when configured value is 0 or negative", async () => {
    vi.setSystemTime(new Date("2026-01-01T06:00:00Z"));
    settingsService.getNumber.mockResolvedValue(0);
    const { catalogSyncJob } = await import("./catalog-sync.job");

    await catalogSyncJob.execute();
    expect(catalogSyncAddMock).toHaveBeenCalledTimes(1);

    // Advance less than 6 hours — guard should block
    vi.advanceTimersByTime(3 * 60 * 60_000);
    await catalogSyncJob.execute();

    expect(catalogSyncAddMock).toHaveBeenCalledTimes(1);
  });
});
