import { describe, expect, it, vi } from "vitest";
import { HealthService } from "@/application/services/health.service";

describe("HealthService", () => {
  it("returns ok when both database and redis pings succeed", async () => {
    const connectivity = {
      pingDatabase: vi.fn().mockResolvedValue(undefined),
      pingRedis: vi.fn().mockResolvedValue(undefined),
    };
    const service = new HealthService(connectivity);

    await expect(service.check()).resolves.toEqual({
      status: "ok",
      components: { db: "ok", redis: "ok" },
    });
  });

  it("returns degraded with redis down when redis ping fails", async () => {
    const connectivity = {
      pingDatabase: vi.fn().mockResolvedValue(undefined),
      pingRedis: vi.fn().mockRejectedValue(new Error("redis down")),
    };
    const service = new HealthService(connectivity);

    await expect(service.check()).resolves.toEqual({
      status: "degraded",
      components: { db: "ok", redis: "down" },
    });
  });

  it("returns degraded with db down when database ping fails", async () => {
    const connectivity = {
      pingDatabase: vi.fn().mockRejectedValue(new Error("db down")),
      pingRedis: vi.fn().mockResolvedValue(undefined),
    };
    const service = new HealthService(connectivity);

    await expect(service.check()).resolves.toEqual({
      status: "degraded",
      components: { db: "down", redis: "ok" },
    });
  });

  it("returns degraded with both down when both pings fail", async () => {
    const connectivity = {
      pingDatabase: vi.fn().mockRejectedValue(new Error("db down")),
      pingRedis: vi.fn().mockRejectedValue(new Error("redis down")),
    };
    const service = new HealthService(connectivity);

    await expect(service.check()).resolves.toEqual({
      status: "degraded",
      components: { db: "down", redis: "down" },
    });
  });
});
