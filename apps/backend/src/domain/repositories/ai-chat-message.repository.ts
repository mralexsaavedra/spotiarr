import type { AiChatMessage } from "@/domain/entities/ai-chat-message.entity";

export interface AiChatMessageRepository {
  append(message: AiChatMessage): Promise<void>;
  list(): Promise<AiChatMessage[]>;
  clear(): Promise<number>;
}
