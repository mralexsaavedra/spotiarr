import { describe, expect, it, vi, beforeEach } from "vitest";
import { prisma } from "../setup/prisma";
import { PrismaAiChatMessageRepository } from "./prisma-ai-chat-message.repository";

// Mock the default prisma singleton BEFORE importing the repository.
vi.mock("../setup/prisma", () => ({
  prisma: {
    aiChatMessage: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

describe("PrismaAiChatMessageRepository — no-arg constructor fallback", () => {
  beforeEach(() => vi.clearAllMocks());

  it("uses the default module prisma when constructed without arguments", async () => {
    vi.mocked(prisma.aiChatMessage.findMany).mockResolvedValue([]);

    const repo = new PrismaAiChatMessageRepository();
    await repo.list();

    expect(prisma.aiChatMessage.findMany).toHaveBeenCalledOnce();
  });
});
