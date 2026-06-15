import type { AiChatMessageDto } from "@spotiarr/shared";
import type { Request, Response } from "express";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ClearChatMessagesUseCase } from "@/application/use-cases/ai/clear-chat-messages.use-case";
import type { GetChatMessagesUseCase } from "@/application/use-cases/ai/get-chat-messages.use-case";
import type { AiPlaylistQueueService } from "@/domain/services/ai-playlist-queue.service";
import { AiChatController } from "../ai.controller";

function mockRes(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
}

function mockReq(overrides: Partial<Request> = {}): Request {
  return { body: {}, params: {}, query: {}, ...overrides } as unknown as Request;
}

function makeQueueService(): AiPlaylistQueueService {
  return { enqueueGenerate: vi.fn().mockResolvedValue(undefined) };
}

function makeGetChatMessagesUseCase(messages: AiChatMessageDto[] = []): GetChatMessagesUseCase {
  return { execute: vi.fn().mockResolvedValue(messages) } as unknown as GetChatMessagesUseCase;
}

function makeClearChatMessagesUseCase(deleted = 0): ClearChatMessagesUseCase {
  return {
    execute: vi.fn().mockResolvedValue({ deleted }),
  } as unknown as ClearChatMessagesUseCase;
}

const sampleMessage: AiChatMessageDto = {
  id: "m1",
  role: "user",
  content: { key: "aiChat.userPrompt", params: { prompt: "jazz" } },
  playlistId: null,
  errorCode: null,
  createdAt: 1000,
};

describe("AiChatController.getMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("S-B-16 — returns 200 with empty array when thread is empty", () => {
    it("responds 200 with { data: { messages: [] } }", async () => {
      const controller = new AiChatController(
        makeQueueService(),
        undefined,
        makeGetChatMessagesUseCase([]),
        makeClearChatMessagesUseCase(),
      );
      const req = mockReq();
      const res = mockRes();

      await controller.getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = vi.mocked(res.json).mock.calls[0][0] as {
        data: { messages: AiChatMessageDto[] };
      };
      expect(body.data.messages).toEqual([]);
    });
  });

  describe("S-B-17 — returns 200 with ordered messages", () => {
    it("responds 200 with messages returned by use-case", async () => {
      const controller = new AiChatController(
        makeQueueService(),
        undefined,
        makeGetChatMessagesUseCase([sampleMessage]),
        makeClearChatMessagesUseCase(),
      );
      const req = mockReq();
      const res = mockRes();

      await controller.getMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = vi.mocked(res.json).mock.calls[0][0] as {
        data: { messages: AiChatMessageDto[] };
      };
      expect(body.data.messages).toEqual([sampleMessage]);
    });
  });
});

describe("AiChatController.clearMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("S-B-18 — clears thread and returns count", () => {
    it("responds 200 with { data: { deleted: 3 } }", async () => {
      const controller = new AiChatController(
        makeQueueService(),
        undefined,
        makeGetChatMessagesUseCase(),
        makeClearChatMessagesUseCase(3),
      );
      const req = mockReq();
      const res = mockRes();

      await controller.clearMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = vi.mocked(res.json).mock.calls[0][0] as { data: { deleted: number } };
      expect(body.data.deleted).toBe(3);
    });
  });

  describe("S-B-19 — idempotent on empty thread", () => {
    it("responds 200 with { data: { deleted: 0 } } when thread is empty", async () => {
      const controller = new AiChatController(
        makeQueueService(),
        undefined,
        makeGetChatMessagesUseCase(),
        makeClearChatMessagesUseCase(0),
      );
      const req = mockReq();
      const res = mockRes();

      await controller.clearMessages(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const body = vi.mocked(res.json).mock.calls[0][0] as { data: { deleted: number } };
      expect(body.data.deleted).toBe(0);
    });
  });
});
