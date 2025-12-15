import { ApiRoutes } from "@spotiarr/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/hooks/queryKeys";

export const useServerEvents = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource(`${ApiRoutes.BASE}${ApiRoutes.EVENTS}`);

    eventSource.addEventListener("playlists-updated", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.playlists });
      queryClient.invalidateQueries({ queryKey: queryKeys.downloadStatus });
      queryClient.invalidateQueries({
        predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "tracks",
      });
    });

    eventSource.addEventListener("download-history-updated", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.downloadHistory });
    });

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
};
