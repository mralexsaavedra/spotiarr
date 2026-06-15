import {
  type AiChatMessageDto,
  type AiPlaylistErrorCode,
  type AiPlaylistStage,
} from "@spotiarr/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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

  // Compute displayMessages: server data + any optimistic entries not yet reconciled.
  // No content-based suppression — each optimistic entry has a unique UUID id, so
  // re-submitting an identical prompt correctly shows a new bubble alongside existing
  // server messages with the same text.
  const displayMessages: AiChatMessageDto[] = [...serverMessages, ...optimisticMessages];

  // Lifecycle reconciliation: drop optimistic entries whose server counterpart has landed.
  // An optimistic user entry is considered persisted when serverMessages contains a user
  // message with the same prompt text and a createdAt >= the optimistic entry's createdAt
  // (i.e., the message was written after or at the same instant the optimistic was created).
  // Briefly showing both for one render cycle before this effect fires is acceptable;
  // a PERMANENT duplicate (entry never cleared) is not.
  useEffect(() => {
    if (optimisticMessages.length === 0) return;

    const remaining = optimisticMessages.filter((opt) => {
      if (opt.role !== "user") return true;
      const optPrompt = opt.content.params?.prompt as string | undefined;
      if (!optPrompt) return true;
      // Check if server now carries a user message with the same prompt that arrived
      // at or after the optimistic was added
      const isLanded = serverMessages.some(
        (s) =>
          s.role === "user" &&
          (s.content.params?.prompt as string | undefined) === optPrompt &&
          s.createdAt >= opt.createdAt,
      );
      return !isLanded;
    });

    if (remaining.length !== optimisticMessages.length) {
      setOptimisticMessages(remaining);
    }
  }, [serverMessages]); // eslint-disable-line react-hooks/exhaustive-deps

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

    // Add optimistic user entry with a unique UUID so re-submitting an identical
    // prompt does not collide with an existing server message's id or another optimistic entry.
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
      const result = await mutation.mutateAsync(text);
      setJobId(result.jobId);
      setIsGenerating(true);
    } catch (e) {
      // Mutation rejected — clear the optimistic entry and surface the error.
      // setStage("error") is required so Chat.tsx renders the ephemeral error block
      // (showEphemeralError is gated on stage === "error").
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
