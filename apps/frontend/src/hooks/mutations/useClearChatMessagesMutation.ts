import { type ClearChatMessagesResponseDto } from "@spotiarr/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { aiChatService } from "@/services/aiChat.service";
import { queryKeys } from "../queryKeys";

export const useClearChatMessagesMutation = () => {
  const queryClient = useQueryClient();

  return useMutation<ClearChatMessagesResponseDto>({
    mutationFn: () => aiChatService.clearChatMessages(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.aiChatMessages });
    },
  });
};
