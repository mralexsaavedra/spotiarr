import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ClearChatMessagesUseCase } from "@/application/use-cases/ai/clear-chat-messages.use-case";
import type { GetChatMessagesUseCase } from "@/application/use-cases/ai/get-chat-messages.use-case";
import { AiChatError } from "@/domain/errors/ai-chat.error";
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

function makeListModelsFn(models: string[] = []) {
  return vi.fn().mockResolvedValue(models);
}

function makeGetChatMessagesUseCase(): GetChatMessagesUseCase {
  return { execute: vi.fn().mockResolvedValue([]) } as unknown as GetChatMessagesUseCase;
}

function makeClearChatMessagesUseCase(): ClearChatMessagesUseCase {
  return {
    execute: vi.fn().mockResolvedValue({ deleted: 0 }),
  } as unknown as ClearChatMessagesUseCase;
}

describe("AiChatController.generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 202 with a jobId when prompt is valid", async () => {
    const queueService = makeQueueService();
    const controller = new AiChatController(
      queueService,
      undefined,
      makeGetChatMessagesUseCase(),
      makeClearChatMessagesUseCase(),
    );
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
    const controller = new AiChatController(
      queueService,
      undefined,
      makeGetChatMessagesUseCase(),
      makeClearChatMessagesUseCase(),
    );
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
    const controller = new AiChatController(
      queueService,
      undefined,
      makeGetChatMessagesUseCase(),
      makeClearChatMessagesUseCase(),
    );
    const req = { body: { prompt: "chill lofi" } } as Request;
    const res = mockRes();

    await controller.generate(req, res);

    expect(queueService.enqueueGenerate).toHaveBeenCalledTimes(1);
  });
});

describe("AiChatController.listModels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with models array on success", async () => {
    const listModelsFn = makeListModelsFn(["gpt-4o", "gpt-3.5-turbo"]);
    const controller = new AiChatController(
      makeQueueService(),
      listModelsFn,
      makeGetChatMessagesUseCase(),
      makeClearChatMessagesUseCase(),
    );
    const req = { body: {} } as Request;
    const res = mockRes();

    await controller.listModels(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonCall = vi.mocked(res.json).mock.calls[0][0] as { data: { models: string[] } };
    expect(jsonCall.data.models).toEqual(["gpt-4o", "gpt-3.5-turbo"]);
  });

  it("returns 200 with empty models array", async () => {
    const listModelsFn = makeListModelsFn([]);
    const controller = new AiChatController(
      makeQueueService(),
      listModelsFn,
      makeGetChatMessagesUseCase(),
      makeClearChatMessagesUseCase(),
    );
    const req = { body: {} } as Request;
    const res = mockRes();

    await controller.listModels(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const jsonCall = vi.mocked(res.json).mock.calls[0][0] as { data: { models: string[] } };
    expect(jsonCall.data.models).toEqual([]);
  });

  it("passes override fields from request body to listModelsFn", async () => {
    const listModelsFn = makeListModelsFn(["gpt-4o"]);
    const controller = new AiChatController(
      makeQueueService(),
      listModelsFn,
      makeGetChatMessagesUseCase(),
      makeClearChatMessagesUseCase(),
    );
    const req = {
      body: { provider: "openai", baseURL: "https://api.openai.com/v1", apiKey: "sk-body" },
    } as Request;
    const res = mockRes();

    await controller.listModels(req, res);

    expect(listModelsFn).toHaveBeenCalledWith({
      provider: "openai",
      baseURL: "https://api.openai.com/v1",
      apiKey: "sk-body",
    });
  });

  it("passes empty overrides when body is empty", async () => {
    const listModelsFn = makeListModelsFn([]);
    const controller = new AiChatController(
      makeQueueService(),
      listModelsFn,
      makeGetChatMessagesUseCase(),
      makeClearChatMessagesUseCase(),
    );
    const req = { body: {} } as Request;
    const res = mockRes();

    await controller.listModels(req, res);

    expect(listModelsFn).toHaveBeenCalledWith({});
  });

  it("propagates AiChatError (provider-misconfig) as thrown", async () => {
    const listModelsFn = vi
      .fn()
      .mockRejectedValue(new AiChatError("provider-misconfig", "AI_API_KEY must be configured"));
    const controller = new AiChatController(
      makeQueueService(),
      listModelsFn,
      makeGetChatMessagesUseCase(),
      makeClearChatMessagesUseCase(),
    );
    const req = { body: {} } as Request;
    const res = mockRes();

    await expect(controller.listModels(req, res)).rejects.toMatchObject({
      code: "provider-misconfig",
    });
  });
});
