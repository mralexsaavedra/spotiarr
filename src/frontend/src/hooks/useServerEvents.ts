import { ApiRoutes } from "@spotiarr/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import {
  DOWNLOAD_HISTORY_QUERY_KEY,
  DOWNLOAD_STATUS_QUERY_KEY,
  PLAYLISTS_QUERY_KEY,
} from "../hooks/queryKeys";

export const useServerEvents = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource(ApiRoutes.EVENTS);

    eventSource.addEventListener("playlists-updated", () => {
      queryClient.invalidateQueries({ queryKey: PLAYLISTS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: DOWNLOAD_STATUS_QUERY_KEY });
      // Invalidate all track queries as well, since track status affects playlist state
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "tracks",
      });
    });

    eventSource.addEventListener("download-history-updated", () => {
      queryClient.invalidateQueries({ queryKey: DOWNLOAD_HISTORY_QUERY_KEY });
    });

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
      // Do not close explicitly; let the browser attempt to reconnect
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
};
