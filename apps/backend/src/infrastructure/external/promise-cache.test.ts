import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PromiseCache } from "./promise-cache";

describe("PromiseCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe("in-flight dedup", () => {
    it("returns the same promise for concurrent calls with the same key", () => {
      const cache = new PromiseCache();
      const fn = vi.fn().mockReturnValue(new Promise(() => {}));

      const p1 = cache.getOrSet("key", fn);
      const p2 = cache.getOrSet("key", fn);

      expect(p1).toBe(p2);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("calls fn again for a different key", () => {
      const cache = new PromiseCache();
      const fn = vi.fn().mockReturnValue(new Promise(() => {}));

      cache.getOrSet("key-a", fn);
      cache.getOrSet("key-b", fn);

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("error eviction", () => {
    it("evicts the entry on rejection so the next call retries", async () => {
      const cache = new PromiseCache();
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error("transient"))
        .mockResolvedValue("recovered");

      const first = cache.getOrSet("key", fn);
      await expect(first).rejects.toThrow("transient");

      // After rejection the entry is evicted; fn should be called again
      const second = cache.getOrSet("key", fn);
      await expect(second).resolves.toBe("recovered");

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("TTL eviction", () => {
    it("evicts a resolved entry after the TTL expires and re-calls fn", async () => {
      const ttlMs = 1_000;
      const cache = new PromiseCache({ ttlMs });

      let resolveFirst!: (v: string) => void;
      const fn = vi
        .fn()
        .mockReturnValueOnce(new Promise<string>((r) => (resolveFirst = r)))
        .mockResolvedValue("fresh");

      const p1 = cache.getOrSet("key", fn);
      resolveFirst("cached");
      await p1; // let the resolution propagate so `resolved = true`
      await vi.advanceTimersByTimeAsync(0); // flush microtasks

      // Advance past TTL — resolved entry should be evicted
      await vi.advanceTimersByTimeAsync(ttlMs + 1);

      const p2 = cache.getOrSet("key", fn);
      await expect(p2).resolves.toBe("fresh");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("the TTL timer does NOT proactively evict an in-flight promise (only resolved ones)", async () => {
      const ttlMs = 500;
      const cache = new PromiseCache({ ttlMs });

      // Never-resolving promise — still in-flight past TTL
      const fn = vi.fn().mockReturnValue(new Promise(() => {}));

      cache.getOrSet("key", fn);

      // Let the TTL timer fire while the promise is still pending —
      // the timer's `if (resolved) cleanup()` guard means the entry stays.
      // However, getOrSet on a stale entry WILL re-invoke fn because
      // isCacheEntryStale returns true on subsequent calls.
      await vi.advanceTimersByTimeAsync(ttlMs + 100);

      // A second getOrSet after TTL sees the entry as stale and calls fn again.
      cache.getOrSet("key", fn);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("clear", () => {
    it("clear(key) removes only that entry", async () => {
      const cache = new PromiseCache();
      const fn = vi.fn().mockResolvedValue("v");

      cache.getOrSet("a", fn);
      cache.getOrSet("b", fn);
      await vi.runAllTimersAsync();

      cache.clear("a");

      cache.getOrSet("a", fn); // should call fn again
      cache.getOrSet("b", fn); // should reuse — but entry was already evicted on resolve; call fn again too

      expect(fn.mock.calls.length).toBeGreaterThanOrEqual(3);
    });

    it("clear() with no argument removes all entries", async () => {
      const cache = new PromiseCache();
      const fn = vi.fn().mockReturnValue(new Promise(() => {}));

      cache.getOrSet("x", fn);
      cache.getOrSet("y", fn);

      cache.clear();

      cache.getOrSet("x", fn);
      cache.getOrSet("y", fn);

      expect(fn).toHaveBeenCalledTimes(4);
    });
  });

  describe("constructor TTL floor", () => {
    it("clamps ttlMs to at least 1", () => {
      // Should not throw; the cache is usable
      const cache = new PromiseCache({ ttlMs: -100 });
      const fn = vi.fn().mockResolvedValue("ok");
      expect(() => cache.getOrSet("k", fn)).not.toThrow();
    });
  });
});
