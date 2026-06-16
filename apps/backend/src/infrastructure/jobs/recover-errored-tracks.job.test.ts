import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("recoverErroredTracksJob interval guard", () => {
  const recoverErroredTracksUseCase = {
    execute: vi.fn(),
  };

  const settingsService = {
    getNumber: vi.fn((key: string) => {
      if (key === "RECOVERY_JOB_INTERVAL_MINUTES") return Promise.resolve(5);
      return Promise.resolve(0);
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.resetModules();
    vi.doMock("../../container", () => ({
      getContainer: vi.fn(() => ({ recoverErroredTracksUseCase, settingsService })),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock("../../container");
  });

  it("delegates to RecoverErroredTracksUseCase on first run", async () => {
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { recoverErroredTracksJob } = await import("./index");

    await recoverErroredTracksJob.execute();

    expect(recoverErroredTracksUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it("interval guard prevents a second run within the configured interval", async () => {
    vi.setSystemTime(new Date("2026-01-01T01:00:00Z"));
    const { recoverErroredTracksJob } = await import("./index");

    await recoverErroredTracksJob.execute();
    expect(recoverErroredTracksUseCase.execute).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(60_000);

    await recoverErroredTracksJob.execute();
    expect(recoverErroredTracksUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it("interval guard allows a run after the configured interval has elapsed", async () => {
    vi.setSystemTime(new Date("2026-01-01T02:00:00Z"));
    const { recoverErroredTracksJob } = await import("./index");

    await recoverErroredTracksJob.execute();
    expect(recoverErroredTracksUseCase.execute).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(6 * 60_000);

    await recoverErroredTracksJob.execute();
    expect(recoverErroredTracksUseCase.execute).toHaveBeenCalledTimes(2);
  });
});
