import { type AiChatMessageDto } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { aiChatService } from "@/services/aiChat.service";
import { queryKeys } from "../queryKeys";

export const useChatMessagesQuery = () => {
  return useQuery<AiChatMessageDto[]>({
    queryKey: queryKeys.aiChatMessages,
    queryFn: async () => {
      const result = await aiChatService.getChatMessages();
      return result.messages;
    },
    // 30 s stale window — explicit invalidation on done/error/clear covers freshness
    staleTime: 30_000,
  });
};
