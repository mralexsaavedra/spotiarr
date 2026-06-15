import { describe, expect, it, vi, beforeEach } from "vitest";
import type { AiChatMessage } from "@/domain/entities/ai-chat-message.entity";
import { AppError } from "@/domain/errors/app-error";
import { PrismaAiChatMessageRepository } from "../prisma-ai-chat-message.repository";

function makeEntity(overrides: Partial<AiChatMessage> = {}): AiChatMessage {
  return {
    id: "test-id-1",
    role: "user",
    content: { key: "aiChat.userPrompt", params: { prompt: "jazz" } },
    playlistId: null,
    errorCode: null,
    createdAt: Date.now(),
    ...overrides,
  };
}

function makePrismaRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "test-id-1",
    role: "user",
    content: JSON.stringify({ key: "aiChat.userPrompt", params: { prompt: "jazz" } }),
    contentKey: "aiChat.userPrompt",
    contentParams: JSON.stringify({ prompt: "jazz" }),
    playlistId: null,
    errorCode: null,
    createdAt: BigInt(1000),
    ...overrides,
  };
}

describe("PrismaAiChatMessageRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("S-B-08: list returns messages in ascending createdAt order", () => {
    it("returns messages ordered ascending by createdAt as JS numbers", async () => {
      const rows = [
        makePrismaRow({ id: "id-2", createdAt: BigInt(2000) }),
        makePrismaRow({ id: "id-1", createdAt: BigInt(1000) }),
        makePrismaRow({ id: "id-3", createdAt: BigInt(3000) }),
      ];
      const prisma = {
        aiChatMessage: {
          findMany: vi.fn().mockResolvedValue(rows),
        },
      } as any;

      const repo = new PrismaAiChatMessageRepository(prisma);
      const result = await repo.list();

      expect(prisma.aiChatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: "asc" },
        }),
      );
      expect(result.map((r) => r.createdAt)).toEqual([2000, 1000, 3000]);
      result.forEach((r) => {
        expect(typeof r.createdAt).toBe("number");
      });
    });
  });

  describe("S-B-09: clear removes all rows and returns count", () => {
    it("calls deleteMany and returns deleted count", async () => {
      const prisma = {
        aiChatMessage: {
          deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
          findMany: vi.fn().mockResolvedValue([]),
        },
      } as any;

      const repo = new PrismaAiChatMessageRepository(prisma);
      const count = await repo.clear();

      expect(prisma.aiChatMessage.deleteMany).toHaveBeenCalledWith({});
      expect(count).toBe(3);
    });
  });

  describe("S-B-10: append serialises content as JSON string", () => {
    it("stores content as JSON-parseable string in the DB row", async () => {
      const prisma = {
        aiChatMessage: {
          create: vi.fn().mockImplementation(({ data }) => {
            return Promise.resolve({
              ...data,
              createdAt: data.createdAt,
            });
          }),
        },
      } as any;

      const entity = makeEntity({
        content: { key: "aiChat.userPrompt", params: { prompt: "metal" } },
      });
      const repo = new PrismaAiChatMessageRepository(prisma);
      await repo.append(entity);

      expect(prisma.aiChatMessage.create).toHaveBeenCalledOnce();
      const createArg = (prisma.aiChatMessage.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
      const storedContent = createArg.data.content;
      expect(() => JSON.parse(storedContent)).not.toThrow();
      const parsed = JSON.parse(storedContent);
      expect(parsed.key).toBe("aiChat.userPrompt");
    });
  });

  describe("R-INFRA-5: Prisma errors are mapped to AppError before leaving the repository", () => {
    it("maps a Prisma failure in append() to AppError with internal_server_error", async () => {
      const prismaError = Object.assign(new Error("Unique constraint failed"), { code: "P2002" });
      const prisma = {
        aiChatMessage: {
          create: vi.fn().mockRejectedValue(prismaError),
        },
      } as any;

      const repo = new PrismaAiChatMessageRepository(prisma);
      await expect(repo.append(makeEntity())).rejects.toBeInstanceOf(AppError);
      await expect(repo.append(makeEntity())).rejects.toMatchObject({
        errorCode: "internal_server_error",
        statusCode: 500,
      });
    });

    it("maps a Prisma failure in list() to AppError with internal_server_error", async () => {
      const prismaError = new Error("Connection reset");
      const prisma = {
        aiChatMessage: {
          findMany: vi.fn().mockRejectedValue(prismaError),
        },
      } as any;

      const repo = new PrismaAiChatMessageRepository(prisma);
      await expect(repo.list()).rejects.toBeInstanceOf(AppError);
      await expect(repo.list()).rejects.toMatchObject({
        errorCode: "internal_server_error",
        statusCode: 500,
      });
    });

    it("maps a Prisma failure in clear() to AppError with internal_server_error", async () => {
      const prismaError = new Error("Disk full");
      const prisma = {
        aiChatMessage: {
          deleteMany: vi.fn().mockRejectedValue(prismaError),
        },
      } as any;

      const repo = new PrismaAiChatMessageRepository(prisma);
      await expect(repo.clear()).rejects.toBeInstanceOf(AppError);
      await expect(repo.clear()).rejects.toMatchObject({
        errorCode: "internal_server_error",
        statusCode: 500,
      });
    });
  });
});
