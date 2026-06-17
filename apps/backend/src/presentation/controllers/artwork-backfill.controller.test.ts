import type { Request, Response } from "express";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { GetArtworkBackfillStatusUseCase } from "@/application/use-cases/artwork-backfill/get-artwork-backfill-status.use-case";
import type { PauseArtworkBackfillUseCase } from "@/application/use-cases/artwork-backfill/pause-artwork-backfill.use-case";
import type { ResumeArtworkBackfillUseCase } from "@/application/use-cases/artwork-backfill/resume-artwork-backfill.use-case";
import type { StartArtworkBackfillUseCase } from "@/application/use-cases/artwork-backfill/start-artwork-backfill.use-case";
import { ArtworkBackfillController } from "./artwork-backfill.controller";

const FAKE_STATUS = {
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
};

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

function makeController(
  overrides: {
    start?: Partial<StartArtworkBackfillUseCase>;
    pause?: Partial<PauseArtworkBackfillUseCase>;
    resume?: Partial<ResumeArtworkBackfillUseCase>;
    status?: Partial<GetArtworkBackfillStatusUseCase>;
  } = {},
): ArtworkBackfillController {
  return new ArtworkBackfillController(
    {
      execute: vi.fn().mockResolvedValue({ runId: "run-1", status: "running" }),
      ...overrides.start,
    } as unknown as StartArtworkBackfillUseCase,
    {
      execute: vi.fn().mockResolvedValue({ runId: "run-1", status: "paused" }),
      ...overrides.pause,
    } as unknown as PauseArtworkBackfillUseCase,
    {
      execute: vi.fn().mockResolvedValue({ runId: "run-1", status: "running" }),
      ...overrides.resume,
    } as unknown as ResumeArtworkBackfillUseCase,
    {
      execute: vi.fn().mockResolvedValue(FAKE_STATUS),
      ...overrides.status,
    } as unknown as GetArtworkBackfillStatusUseCase,
  );
}

describe("ArtworkBackfillController", () => {
  let controller: ArtworkBackfillController;

  beforeEach(() => {
    controller = makeController();
    vi.clearAllMocks();
  });

  it("handles start -> status flow", async () => {
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

  describe("start", () => {
    it("responds 202 with the data from the start use case", async () => {
      const startData = { runId: "run-2", status: "running" };
      const execute = vi.fn().mockResolvedValue(startData);
      controller = makeController({ start: { execute } });

      const res = mockRes();
      await controller.start({} as Request, res);

      expect(execute).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ data: startData });
    });
  });

  describe("pause", () => {
    it("responds 202 with the data from the pause use case", async () => {
      const pauseData = { runId: "run-1", status: "paused" };
      const execute = vi.fn().mockResolvedValue(pauseData);
      controller = makeController({ pause: { execute } });

      const res = mockRes();
      await controller.pause({} as Request, res);

      expect(execute).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ data: pauseData });
    });
  });

  describe("resume", () => {
    it("responds 202 with the data from the resume use case", async () => {
      const resumeData = { runId: "run-1", status: "running" };
      const execute = vi.fn().mockResolvedValue(resumeData);
      controller = makeController({ resume: { execute } });

      const res = mockRes();
      await controller.resume({} as Request, res);

      expect(execute).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({ data: resumeData });
    });
  });

  describe("status", () => {
    it("responds with the data from the status use case", async () => {
      const statusData = { ...FAKE_STATUS, processed: 5 };
      const execute = vi.fn().mockResolvedValue(statusData);
      controller = makeController({ status: { execute } });

      const res = mockRes();
      await controller.status({} as Request, res);

      expect(execute).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ data: statusData });
    });
  });
});
