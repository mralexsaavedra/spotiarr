import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { ArtworkBackfillController } from "./artwork-backfill.controller";

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

describe("ArtworkBackfillController", () => {
  it("handles start -> status flow", async () => {
    const controller = new ArtworkBackfillController(
      { execute: vi.fn().mockResolvedValue({ runId: "run-1", status: "running" }) } as any,
      { execute: vi.fn() } as any,
      { execute: vi.fn() } as any,
      {
        execute: vi.fn().mockResolvedValue({
          runId: "run-1",
          status: "running",
          phase: "artists",
          totals: 10,
          processed: 2,
          skippedExisting: 1,
          written: 1,
          failed: 0,
          externalCalls: 0,
          lastCheckpoint: "artist:a1",
          rateLimitUntil: null,
          updatedAt: new Date().toISOString(),
        }),
      } as any,
    );

    const startRes = mockRes();
    await controller.start({} as Request, startRes);
    expect(startRes.status).toHaveBeenCalledWith(202);

    const statusRes = mockRes();
    await controller.status({} as Request, statusRes);
    expect(statusRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ runId: "run-1", status: "running" }),
      }),
    );
  });
});
