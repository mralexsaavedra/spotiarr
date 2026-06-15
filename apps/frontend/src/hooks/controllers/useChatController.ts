import {
  type AiChatMessageDto,
  type AiPlaylistErrorCode,
  type AiPlaylistStage,
} from "@spotiarr/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { aiProgressBus } from "@/lib/aiProgressBus";
import { useClearChatMessagesMutation } from "../mutations/useClearChatMessagesMutation";
import { useGenerateAiPlaylistMutation } from "../mutations/useGenerateAiPlaylistMutation";
import { useChatMessagesQuery } from "../queries/useChatMessagesQuery";
import { queryKeys } from "../queryKeys";

interface ChatError {
  code: AiPlaylistErrorCode;
  message: string;
}

export const useChatController = () => {
  const [prompt, setPrompt] = useState("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [stage, setStage] = useState<AiPlaylistStage | null>(null);
  const [progress, setProgress] = useState(0);
  const [resolvedCount, setResolvedCount] = useState<number | undefined>(undefined);
  const [droppedTitles, setDroppedTitles] = useState<string[]>([]);
  const [playlistId, setPlaylistId] = useState<string | undefined>(undefined);
  const [playlistName, setPlaylistName] = useState<string | undefined>(undefined);
  const [error, setError] = useState<ChatError | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [optimisticMessages, setOptimisticMessages] = useState<AiChatMessageDto[]>([]);

  const mutation = useGenerateAiPlaylistMutation();
  const clearChatMessagesMutation = useClearChatMessagesMutation();
  const queryClient = useQueryClient();
  const { data: serverMessages = [] } = useChatMessagesQuery();

  // Compute displayMessages: server data + optimistic entries not yet reconciled
  const displayMessages = useMemo<AiChatMessageDto[]>(() => {
    const filtered = optimisticMessages.filter((opt) => {
      if (opt.role !== "user") return true;
      const prompt = opt.content.params?.prompt as string | undefined;
      if (!prompt) return true;
      // Suppress optimistic if server already has a matching user message
      const alreadyOnServer = serverMessages.some(
        (s) => s.role === "user" && (s.content.params?.prompt as string | undefined) === prompt,
      );
      return !alreadyOnServer;
    });
    return [...serverMessages, ...filtered];
  }, [serverMessages, optimisticMessages]);

  useEffect(() => {
    const handler = (event: {
      jobId: string;
      stage: AiPlaylistStage;
      progress: number;
      resolvedCount?: number;
      droppedTitles?: string[];
      playlistId?: string;
      playlistName?: string;
      error?: ChatError;
    }) => {
      if (event.jobId !== jobId) return;

      setStage(event.stage);
      setProgress(event.progress);

      if (event.stage === "done") {
        setResolvedCount(event.resolvedCount);
        setDroppedTitles(event.droppedTitles ?? []);
        setPlaylistId(event.playlistId);
        setPlaylistName(event.playlistName);
        setIsGenerating(false);
        void queryClient.invalidateQueries({ queryKey: queryKeys.playlists });
        void queryClient.invalidateQueries({ queryKey: queryKeys.aiChatMessages });
        // Clear optimistic entries; server data will take over after invalidation
        setOptimisticMessages([]);
      }

      if (event.stage === "error") {
        setError(event.error ?? null);
        setIsGenerating(false);
        void queryClient.invalidateQueries({ queryKey: queryKeys.playlists });
        void queryClient.invalidateQueries({ queryKey: queryKeys.aiChatMessages });
        setOptimisticMessages([]);
      }
    };

    aiProgressBus.on(handler);
    return () => {
      aiProgressBus.off(handler);
    };
  }, [jobId, queryClient]);

  const handleSubmit = async () => {
    const text = prompt.trim();
    if (!text) return;

    setError(null);
    setStage(null);
    setResolvedCount(undefined);
    setDroppedTitles([]);
    setPlaylistId(undefined);
    setPlaylistName(undefined);
    setPrompt("");

    // Add optimistic user entry immediately
    const optimisticEntry: AiChatMessageDto = {
      id: "optimistic",
      role: "user",
      content: { key: "aiChat.userPrompt", params: { prompt: text } },
      playlistId: null,
      errorCode: null,
      createdAt: Date.now(),
    };
    setOptimisticMessages([optimisticEntry]);

    const result = await mutation.mutateAsync(text);
    setJobId(result.jobId);
    setIsGenerating(true);
  };

  const clearMessages = () => {
    clearChatMessagesMutation.mutate();
  };

  return {
    prompt,
    setPrompt,
    stage,
    progress,
    resolvedCount,
    droppedTitles,
    playlistId,
    playlistName,
    error,
    isGenerating,
    displayMessages,
    handleSubmit,
    clearMessages,
    isClearPending: clearChatMessagesMutation.isPending,
  };
};
