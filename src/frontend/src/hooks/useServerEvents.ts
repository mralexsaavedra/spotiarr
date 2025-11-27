import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { DOWNLOAD_HISTORY_QUERY_KEY, PLAYLISTS_QUERY_KEY } from "../hooks/queryKeys";

export const useServerEvents = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    eventSource.addEventListener("playlists-updated", () => {
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
      // Invalidate all track queries as well, since track status affects playlist state
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "tracks",
      });
    });

    eventSource.addEventListener("download-history-updated", () => {
      queryClient.invalidateQueries({ queryKey: DOWNLOAD_HISTORY_QUERY_KEY });
    });

    eventSource.onerror = () => {
      // In case of error, close and let React remount hook on next navigation/focus
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
};
