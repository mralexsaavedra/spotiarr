import { describe, expect, it, vi } from "vitest";
import { FeedCacheEvictionService } from "./feed-cache-eviction.service";

describe("FeedCacheEvictionService", () => {
  it("delegates eviction with default cutoff", async () => {
    const port = { evictStaleFeedCache: vi.fn().mockResolvedValue(undefined) };
    const service = new FeedCacheEvictionService(port);

    await service.evictStaleFeedCache(["a1"]);

    expect(port.evictStaleFeedCache).toHaveBeenCalledWith(["a1"], 90);
  });

  it("delegates eviction with explicit cutoff", async () => {
    const port = { evictStaleFeedCache: vi.fn().mockResolvedValue(undefined) };
    const service = new FeedCacheEvictionService(port);

    await service.evictStaleFeedCache([], 30);

    expect(port.evictStaleFeedCache).toHaveBeenCalledWith([], 30);
  });
});
