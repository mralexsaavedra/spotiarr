import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AiPlaylistQueueService } from "@/domain/services/ai-playlist-queue.service";
import { AiChatController } from "./ai.controller";

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function makeQueueService(): AiPlaylistQueueService {
  return {
    enqueueGenerate: vi.fn().mockResolvedValue(undefined),
  };
}

describe("AiChatController.generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 202 with a jobId when prompt is valid", async () => {
    const queueService = makeQueueService();
    const controller = new AiChatController(queueService);
    const req = { body: { prompt: "upbeat 90s rock" } } as Request;
    const res = mockRes();

    await controller.generate(req, res);

    expect(res.status).toHaveBeenCalledWith(202);
    const jsonCall = vi.mocked(res.json).mock.calls[0][0] as { data: { jobId: string } };
    expect(jsonCall).toHaveProperty("data.jobId");
    expect(typeof jsonCall.data.jobId).toBe("string");
    expect(jsonCall.data.jobId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("enqueues a job with the prompt and generated jobId", async () => {
    const queueService = makeQueueService();
    const controller = new AiChatController(queueService);
    const req = { body: { prompt: "jazz standards" } } as Request;
    const res = mockRes();

    await controller.generate(req, res);

    const jsonCall = vi.mocked(res.json).mock.calls[0][0] as { data: { jobId: string } };
    expect(queueService.enqueueGenerate).toHaveBeenCalledWith({
      jobId: jsonCall.data.jobId,
      prompt: "jazz standards",
    });
  });

  it("enqueues exactly once per request", async () => {
    const queueService = makeQueueService();
    const controller = new AiChatController(queueService);
    const req = { body: { prompt: "chill lofi" } } as Request;
    const res = mockRes();

    await controller.generate(req, res);

    expect(queueService.enqueueGenerate).toHaveBeenCalledTimes(1);
  });
});
