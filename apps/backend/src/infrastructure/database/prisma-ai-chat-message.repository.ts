import type { PrismaClient } from "@prisma/client";
import { AiChatMessage } from "@/domain/entities/ai-chat-message.entity";
import type { AiChatMessageRepository } from "@/domain/repositories/ai-chat-message.repository";
import { prisma as defaultPrisma } from "../setup/prisma";

export class PrismaAiChatMessageRepository implements AiChatMessageRepository {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? defaultPrisma;
  }

  async append(message: AiChatMessage): Promise<void> {
    await this.prisma.aiChatMessage.create({
      data: {
        id: message.id,
        role: message.role,
        content: JSON.stringify(message.content),
        contentKey: message.content.key ?? null,
        contentParams: message.content.params ? JSON.stringify(message.content.params) : null,
        playlistId: message.playlistId ?? null,
        errorCode: message.errorCode ?? null,
        createdAt: BigInt(message.createdAt),
      },
    });
  }

  async list(): Promise<AiChatMessage[]> {
    const rows = await this.prisma.aiChatMessage.findMany({
      orderBy: { createdAt: "asc" },
    });

    return rows.map(
      (row) =>
        new AiChatMessage({
          id: row.id,
          role: row.role as "user" | "assistant",
          content: JSON.parse(row.content) as { key: string; params?: Record<string, unknown> },
          playlistId: row.playlistId ?? null,
          errorCode: row.errorCode ?? null,
          createdAt: Number(row.createdAt),
        }),
    );
  }

  async clear(): Promise<number> {
    const result = await this.prisma.aiChatMessage.deleteMany({});
    return result.count;
  }
}
