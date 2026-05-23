import { describe, expect, it, vi } from "vitest";
import { HealthService } from "@/application/services/health.service";

describe("HealthService", () => {
  it("returns ok when database ping succeeds", async () => {
    const connectivity = { pingDatabase: vi.fn().mockResolvedValue(undefined) };
    const service = new HealthService(connectivity);

    await expect(service.check()).resolves.toEqual({
      status: "ok",
      checks: { database: "ok" },
    });
  });

  it("returns degraded when database ping fails", async () => {
    const connectivity = { pingDatabase: vi.fn().mockRejectedValue(new Error("db down")) };
    const service = new HealthService(connectivity);

    await expect(service.check()).resolves.toEqual({
      status: "degraded",
      checks: { database: "error" },
    });
  });
});
