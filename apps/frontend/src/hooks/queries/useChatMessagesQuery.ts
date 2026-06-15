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
    staleTime: 0,
  });
};
