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
    playlistId: null,
    errorCode: null,
    createdAt: BigInt(1000),
    ...overrides,
  };
}

describe("PrismaAiChatMessageRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("S-B-08: list returns messages in ascending createdAt order", () => {
    it("queries with desc orderBy (most-recent 500) and returns rows in ascending createdAt order", async () => {
      // Mock returns rows in descending order (as Prisma would with orderBy desc)
      const rows = [
        makePrismaRow({ id: "id-3", createdAt: BigInt(3000) }),
        makePrismaRow({ id: "id-2", createdAt: BigInt(2000) }),
        makePrismaRow({ id: "id-1", createdAt: BigInt(1000) }),
      ];
      const prisma = {
        aiChatMessage: {
          findMany: vi.fn().mockResolvedValue(rows),
        },
      } as any;

      const repo = new PrismaAiChatMessageRepository(prisma);
      const result = await repo.list();

      // toHaveBeenCalledWith enforces desc orderBy — the ascending OUTPUT alone cannot enforce this
      expect(prisma.aiChatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: expect.arrayContaining([expect.objectContaining({ createdAt: "desc" })]),
        }),
      );
      // Output must be in ascending order (repository reverses the desc query result)
      expect(result.map((r) => r.createdAt)).toEqual([1000, 2000, 3000]);
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
      // Dead columns must not be written
      expect(createArg.data).not.toHaveProperty("contentKey");
      expect(createArg.data).not.toHaveProperty("contentParams");
    });
  });

  describe("S-B-08b: list passes desc orderBy and take 500 to Prisma, returns ascending output", () => {
    it("passes orderBy [createdAt desc, id desc] and take 500 to findMany, returns rows in ascending order", async () => {
      // Mock returns rows in descending order (most-recent first, as Prisma would with desc)
      const rows = [
        makePrismaRow({ id: "id-3", createdAt: BigInt(3000) }),
        makePrismaRow({ id: "id-2", createdAt: BigInt(2000) }),
        makePrismaRow({ id: "id-1", createdAt: BigInt(1000) }),
      ];
      const prisma = {
        aiChatMessage: {
          findMany: vi.fn().mockResolvedValue(rows),
        },
      } as any;

      const repo = new PrismaAiChatMessageRepository(prisma);
      const result = await repo.list();

      // toHaveBeenCalledWith asserts the desc clause — the ascending output alone cannot enforce this
      expect(prisma.aiChatMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 500,
        }),
      );
      // Repository must reverse the desc result so callers receive ascending order
      expect(result.map((r) => r.createdAt)).toEqual([1000, 2000, 3000]);
    });
  });

  describe("R-INFRA-6: corrupt rows are skipped, valid rows still returned", () => {
    it("skips rows with invalid JSON content and returns remaining valid rows", async () => {
      // Mock returns rows in desc order (most-recent first), as Prisma would with orderBy desc
      const rows = [
        makePrismaRow({ id: "id-good-2", createdAt: BigInt(3000) }),
        makePrismaRow({ id: "id-corrupt", content: "not-json", createdAt: BigInt(2000) }),
        makePrismaRow({ id: "id-good-1", createdAt: BigInt(1000) }),
      ];
      const prisma = {
        aiChatMessage: {
          findMany: vi.fn().mockResolvedValue(rows),
        },
      } as any;

      const repo = new PrismaAiChatMessageRepository(prisma);
      const result = await repo.list();

      // Corrupt row is skipped; valid rows are returned in ascending order
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(["id-good-1", "id-good-2"]);
    });

    it("skips rows with an invalid role and returns remaining valid rows", async () => {
      // Mock returns rows in desc order (most-recent first), as Prisma would with orderBy desc
      const rows = [
        makePrismaRow({ id: "id-good-2", createdAt: BigInt(3000) }),
        makePrismaRow({ id: "id-bad-role", role: "system", createdAt: BigInt(2000) }),
        makePrismaRow({ id: "id-good-1", createdAt: BigInt(1000) }),
      ];
      const prisma = {
        aiChatMessage: {
          findMany: vi.fn().mockResolvedValue(rows),
        },
      } as any;

      const repo = new PrismaAiChatMessageRepository(prisma);
      const result = await repo.list();

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.id)).toEqual(["id-good-1", "id-good-2"]);
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
