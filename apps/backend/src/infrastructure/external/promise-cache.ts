import { createPromiseCacheEntry, isCacheEntryStale, PromiseCacheEntry } from "./cache.types";

interface PromiseCacheOptions {
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 30_000;

export class PromiseCache {
  private readonly ttlMs: number;
  private readonly entries = new Map<string, PromiseCacheEntry<unknown>>();

  constructor(options: PromiseCacheOptions = {}) {
    this.ttlMs = Math.max(1, options.ttlMs ?? DEFAULT_TTL_MS);
  }

  getOrSet<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.entries.get(key);

    if (existing && !isCacheEntryStale(existing)) {
      return existing.promise as Promise<T>;
    }

    if (existing && isCacheEntryStale(existing)) {
      this.entries.delete(key);
    }

    const promise = fn();
    this.entries.set(key, createPromiseCacheEntry(promise, this.ttlMs));

    let resolved = false;

    const cleanup = () => {
      const current = this.entries.get(key);
      if (current?.promise === promise) {
        this.entries.delete(key);
      }
    };

    // On error: evict immediately so the next caller retries
    promise.then(() => {
      resolved = true;
    }, cleanup);

    // On TTL expiry: only evict if the promise already resolved.
    // If still in-flight, leave it — evicting would cause a duplicate request.
    const ttlTimer = setTimeout(() => {
      if (resolved) cleanup();
    }, this.ttlMs);
    ttlTimer.unref?.();

    return promise;
  }

  clear(key?: string): void {
    if (key) {
      this.entries.delete(key);
      return;
    }

    this.entries.clear();
  }
}
