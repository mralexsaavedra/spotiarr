import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import type { HealthService } from "@/application/services/health.service";
import { HealthController } from "./health.controller";

function mockRes(): Response {
  const jsonFn = vi.fn().mockReturnThis();
  const statusFn = vi.fn().mockReturnThis();

  return {
    json: jsonFn,
    status: statusFn,
  } as unknown as Response;
}

describe("HealthController", () => {
  it("returns 200 with { status: 'ok' } for healthy report", async () => {
    const healthService = {
      check: vi.fn().mockResolvedValue({ status: "ok", components: { db: "ok", redis: "ok" } }),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    const res = mockRes();
    await controller.check({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ status: "ok" });
  });

  it("returns 503 with degraded components shape when redis is down", async () => {
    const healthService = {
      check: vi
        .fn()
        .mockResolvedValue({ status: "degraded", components: { db: "ok", redis: "down" } }),
    } as unknown as HealthService;
    const controller = new HealthController(healthService);

    const res = mockRes();
    await controller.check({} as Request, res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      status: "degraded",
      components: { db: "ok", redis: "down" },
    });
  });
});
