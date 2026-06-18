import {
  type AiChatMessageDto,
  type AiPlaylistErrorCode,
  type AiPlaylistStage,
} from "@spotiarr/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { aiProgressBus } from "@/lib/aiProgressBus";
import { detectListeningIntent } from "@/utils/detect-listening-intent";
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
  // dataUpdatedAt captured when the optimistic entry was added (see reconciliation effect).
  const optimisticAddedAtQueryTimestamp = useRef<number>(0);

  const mutation = useGenerateAiPlaylistMutation();
  const clearChatMessagesMutation = useClearChatMessagesMutation();
  const queryClient = useQueryClient();
  const { data: serverMessages = [], dataUpdatedAt } = useChatMessagesQuery();

  const displayMessages: AiChatMessageDto[] = [...serverMessages, ...optimisticMessages];

  // Drop optimistic entries once a server refetch has completed after they were added.
  // Keyed on dataUpdatedAt (client-side fetch clock) to avoid comparing client/server clocks.
  useEffect(() => {
    if (optimisticMessages.length === 0) return;
    if (dataUpdatedAt > optimisticAddedAtQueryTimestamp.current) {
      setOptimisticMessages([]);
    }
  }, [dataUpdatedAt, optimisticMessages.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (isGenerating) return; // guard: don't start a second generation / overwrite optimistic entry

    setError(null);
    setStage(null);
    setResolvedCount(undefined);
    setDroppedTitles([]);
    setPlaylistId(undefined);
    setPlaylistName(undefined);
    setPrompt("");

    optimisticAddedAtQueryTimestamp.current = dataUpdatedAt;

    // Unique id so re-submitting an identical prompt yields a distinct bubble.
    const optimisticEntry: AiChatMessageDto = {
      id: crypto.randomUUID(),
      role: "user",
      content: { key: "aiChat.userPrompt", params: { prompt: text } },
      playlistId: null,
      errorCode: null,
      createdAt: Date.now(),
    };
    setOptimisticMessages([optimisticEntry]);

    try {
      const { scope } = detectListeningIntent(text);
      const result = await mutation.mutateAsync({
        prompt: text,
        intent: scope ?? undefined,
      });
      setJobId(result.jobId);
      setIsGenerating(true);
    } catch (e) {
      // stage="error" so Chat.tsx renders the error block (gated on stage === "error").
      setOptimisticMessages([]);
      setStage("error");
      setError({
        code: "provider-unreachable",
        message: e instanceof Error ? e.message : String(e),
      });
    }
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
