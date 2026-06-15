import type { PrismaClient } from "@prisma/client";
import { getErrorMessage } from "@/application/utils/error.utils";
import { AiChatMessage } from "@/domain/entities/ai-chat-message.entity";
import { AppError } from "@/domain/errors/app-error";
import type { AiChatMessageRepository } from "@/domain/repositories/ai-chat-message.repository";
import { prisma as defaultPrisma } from "../setup/prisma";

export class PrismaAiChatMessageRepository implements AiChatMessageRepository {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? defaultPrisma;
  }

  async append(message: AiChatMessage): Promise<void> {
    try {
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
    } catch (e) {
      throw new AppError(500, "internal_server_error", getErrorMessage(e));
    }
  }

  async list(): Promise<AiChatMessage[]> {
    try {
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
    } catch (e) {
      if (e instanceof AppError) throw e;
      throw new AppError(500, "internal_server_error", getErrorMessage(e));
    }
  }

  async clear(): Promise<number> {
    try {
      const result = await this.prisma.aiChatMessage.deleteMany({});
      return result.count;
    } catch (e) {
      throw new AppError(500, "internal_server_error", getErrorMessage(e));
    }
  }
}
