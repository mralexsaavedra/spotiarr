import { type AiPlaylistErrorCode, type AiPlaylistStage } from "@spotiarr/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { aiProgressBus } from "@/lib/aiProgressBus";
import { useGenerateAiPlaylistMutation } from "../mutations/useGenerateAiPlaylistMutation";
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
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);

  const mutation = useGenerateAiPlaylistMutation();
  const queryClient = useQueryClient();

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
      }

      if (event.stage === "error") {
        setError(event.error ?? null);
        setIsGenerating(false);
        void queryClient.invalidateQueries({ queryKey: queryKeys.playlists });
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

    setMessages((prev) => [...prev, { role: "user", text }]);
    setPrompt("");

    const result = await mutation.mutateAsync(text);
    setJobId(result.jobId);
    setIsGenerating(true);
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
    messages,
    handleSubmit,
  };
};
