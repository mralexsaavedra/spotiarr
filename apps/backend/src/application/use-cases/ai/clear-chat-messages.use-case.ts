import type { AiChatMessageRepository } from "@/domain/repositories/ai-chat-message.repository";

export interface ClearChatMessagesResult {
  deleted: number;
}

export class ClearChatMessagesUseCase {
  constructor(private readonly repository: AiChatMessageRepository) {}

  async execute(): Promise<ClearChatMessagesResult> {
    const deleted = await this.repository.clear();
    return { deleted };
  }
}
