import type { ListeningScope } from "@spotiarr/shared";
import { useMutation } from "@tanstack/react-query";
import { aiChatService } from "@/services/aiChat.service";

export interface GenerateAiPlaylistMutationInput {
  prompt: string;
  intent?: ListeningScope;
}

export const useGenerateAiPlaylistMutation = () =>
  useMutation({
    mutationFn: ({ prompt, intent }: GenerateAiPlaylistMutationInput) =>
      aiChatService.generate(prompt, intent),
  });
