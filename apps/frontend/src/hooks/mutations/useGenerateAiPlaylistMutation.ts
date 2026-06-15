import { useMutation } from "@tanstack/react-query";
import { aiChatService } from "@/services/aiChat.service";

export const useGenerateAiPlaylistMutation = () =>
  useMutation({
    mutationFn: (prompt: string) => aiChatService.generate(prompt),
  });
