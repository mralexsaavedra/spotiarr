import { describe, expect, it, vi } from "vitest";
import { ARTWORK_BACKFILL_QUEUE, getArtworkBackfillQueue, initializeQueues } from "./queues";

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation((_name: string) => ({ add: vi.fn() })),
}));

vi.mock("../setup/environment", () => ({
  getEnv: () => ({ REDIS_HOST: "localhost", REDIS_PORT: 6379 }),
}));

describe("queues artwork backfill foundation", () => {
  it("initializes and exposes artwork backfill queue", () => {
    initializeQueues();

    const queue = getArtworkBackfillQueue();

    expect(queue).toBeDefined();
    expect(ARTWORK_BACKFILL_QUEUE).toBe("artwork-backfill-queue");
  });
});
