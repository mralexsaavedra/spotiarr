import { AiChatMessage } from "@/domain/entities/ai-chat-message.entity";
import type { AiChatMessageRepository } from "@/domain/repositories/ai-chat-message.repository";

export interface AppendChatMessageInput {
  role: "user" | "assistant";
  contentKey: string;
  contentParams?: Record<string, unknown>;
  playlistId?: string | null;
  errorCode?: string | null;
}

export class AppendChatMessageUseCase {
  constructor(private readonly repository: AiChatMessageRepository) {}

  async execute(input: AppendChatMessageInput): Promise<void> {
    const message = new AiChatMessage({
      id: crypto.randomUUID(),
      role: input.role,
      content: {
        key: input.contentKey,
        params: input.contentParams,
      },
      playlistId: input.playlistId ?? null,
      errorCode: input.errorCode ?? null,
      createdAt: Date.now(),
    });

    await this.repository.append(message);
  }
}
