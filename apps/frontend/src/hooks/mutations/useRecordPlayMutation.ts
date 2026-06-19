import { useMutation } from "@tanstack/react-query";
import { historyService } from "@/services/history.service";
import type { QueueItem } from "@/store/usePlayerStore";

/**
 * Fire-and-forget mutation that records a play event.
 * Errors are logged and swallowed — a failed record MUST NOT disrupt playback.
 */
export const useRecordPlayMutation = () =>
  useMutation({
    mutationFn: (item: QueueItem) => historyService.recordPlay(item),
    onError: (error) => {
      console.error("[useRecordPlayMutation] Failed to record play:", error);
    },
  });
