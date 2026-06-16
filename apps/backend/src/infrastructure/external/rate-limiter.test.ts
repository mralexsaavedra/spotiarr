import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimiter } from "./rate-limiter";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("immediate execution", () => {
    it("executes immediately when below max concurrency", async () => {
      const limiter = new RateLimiter({ maxConcurrency: 2, minIntervalMs: 0 });
      const fn = vi.fn().mockResolvedValue("result");

      const promise = limiter.queueRequest(fn);
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe("result");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("returns the resolved value of the wrapped function", async () => {
      const limiter = new RateLimiter({ minIntervalMs: 0 });
      const fn = vi.fn().mockResolvedValue(42);

      const promise = limiter.queueRequest(fn);
      await vi.runAllTimersAsync();

      await expect(promise).resolves.toBe(42);
    });

    it("propagates rejection from the wrapped function", async () => {
      const limiter = new RateLimiter({ minIntervalMs: 0 });
      const fn = vi.fn().mockImplementation(() => Promise.reject(new Error("boom")));

      // Attach assertion immediately so the rejection is handled before it can go unhandled
      const assertion = expect(limiter.queueRequest(fn)).rejects.toThrow("boom");
      await vi.runAllTimersAsync();
      await assertion;
    });
  });

  describe("queue overflow", () => {
    it("rejects immediately when queue is at max capacity", async () => {
      const limiter = new RateLimiter({
        maxConcurrency: 1,
        maxQueueSize: 1,
        queueTimeoutMs: 60_000,
        minIntervalMs: 0,
      });

      // Never-resolving tasks — suppress all unhandled rejections from queue timeouts
      const pending1 = limiter.queueRequest(() => new Promise(() => {}));
      pending1.catch(() => {});

      const pending2 = limiter.queueRequest(() => new Promise(() => {}));
      pending2.catch(() => {});

      // This one overflows
      await expect(limiter.queueRequest(vi.fn())).rejects.toMatchObject({
        statusCode: 503,
        errorCode: "rate_limiter_overflow",
      });
    });
  });

  describe("queue timeout", () => {
    it("rejects queued items that wait beyond queueTimeoutMs", async () => {
      const limiter = new RateLimiter({
        maxConcurrency: 1,
        queueTimeoutMs: 1_000,
        minIntervalMs: 0,
      });

      // occupy the single slot with a never-resolving task; suppress unhandled rejection
      const neverResolve = new Promise<never>(() => {});
      neverResolve.catch(() => {});
      const blockFn = vi.fn().mockReturnValue(neverResolve);
      const blockPromise = limiter.queueRequest(blockFn);
      blockPromise.catch(() => {}); // suppress
      await vi.advanceTimersByTimeAsync(0); // let the active slot be taken

      // queue a second request that will time out — attach assertion before advancing timers
      const queuedFn = vi.fn().mockImplementation(() => Promise.resolve("ok"));
      const queuedAssertion = expect(limiter.queueRequest(queuedFn)).rejects.toThrow(
        /Queue timeout/,
      );

      // advance past the timeout
      await vi.advanceTimersByTimeAsync(1_001);

      await queuedAssertion;
    });
  });

  describe("concurrency limit", () => {
    it("does not start a second task while first is active (minInterval=0)", async () => {
      const limiter = new RateLimiter({ maxConcurrency: 1, minIntervalMs: 0 });

      let firstResolve!: () => void;
      const firstFn = vi.fn().mockReturnValue(new Promise<void>((r) => (firstResolve = r)));
      const secondFn = vi.fn().mockResolvedValue("second");

      const first = limiter.queueRequest(firstFn);
      const second = limiter.queueRequest(secondFn);

      await vi.advanceTimersByTimeAsync(0);
      expect(firstFn).toHaveBeenCalledTimes(1);
      expect(secondFn).toHaveBeenCalledTimes(0);

      firstResolve();
      await vi.runAllTimersAsync();

      await first;
      await expect(second).resolves.toBe("second");
      expect(secondFn).toHaveBeenCalledTimes(1);
    });

    it("runs up to maxConcurrency tasks simultaneously", async () => {
      const limiter = new RateLimiter({ maxConcurrency: 3, minIntervalMs: 0 });
      const resolvers: Array<() => void> = [];

      const fns = Array.from({ length: 3 }, (_, i) =>
        vi.fn().mockReturnValue(
          new Promise<number>((r) => {
            resolvers.push(() => r(i));
          }),
        ),
      );

      const promises = fns.map((fn) => limiter.queueRequest(fn));
      await vi.advanceTimersByTimeAsync(0);

      // All three should have been called
      fns.forEach((fn) => expect(fn).toHaveBeenCalledTimes(1));

      resolvers.forEach((r) => r());
      await vi.runAllTimersAsync();
      await Promise.all(promises);
    });
  });

  describe("minInterval enforcement", () => {
    it("delays the second execution by minIntervalMs", async () => {
      const limiter = new RateLimiter({ maxConcurrency: 2, minIntervalMs: 500 });
      const calls: number[] = [];

      const fn = vi.fn().mockImplementation(() => {
        calls.push(Date.now());
        return Promise.resolve("ok");
      });

      const p1 = limiter.queueRequest(fn);
      await vi.advanceTimersByTimeAsync(0);

      const p2 = limiter.queueRequest(fn);
      await vi.runAllTimersAsync();

      await p1;
      await p2;

      expect(calls).toHaveLength(2);
      expect(calls[1] - calls[0]).toBeGreaterThanOrEqual(500);
    });
  });
});
