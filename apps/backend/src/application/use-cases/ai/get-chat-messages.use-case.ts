import type { AiChatMessageDto } from "@spotiarr/shared";
import type { AiChatMessage } from "@/domain/entities/ai-chat-message.entity";
import type { AiChatMessageRepository } from "@/domain/repositories/ai-chat-message.repository";

function toDto(entity: AiChatMessage): AiChatMessageDto {
  return {
    id: entity.id,
    role: entity.role,
    content: entity.content,
    playlistId: entity.playlistId,
    errorCode: entity.errorCode,
    createdAt: entity.createdAt,
  };
}

export class GetChatMessagesUseCase {
  constructor(private readonly repository: AiChatMessageRepository) {}

  async execute(): Promise<AiChatMessageDto[]> {
    const messages = await this.repository.list();
    return messages.map(toDto);
  }
}
