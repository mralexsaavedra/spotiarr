import { ApiRoutes } from "@spotiarr/shared";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryKeys } from "@/hooks/queryKeys";

interface ArtworkBackfillUpdatedEvent {
  status?: string;
}

const parseArtworkBackfillEvent = (event: MessageEvent): ArtworkBackfillUpdatedEvent => {
  if (!event.data) return {};

  try {
    return JSON.parse(String(event.data)) as ArtworkBackfillUpdatedEvent;
  } catch {
    return {};
  }
};

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

    eventSource.addEventListener("library-updated", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.libraryStats });
      queryClient.invalidateQueries({ queryKey: queryKeys.libraryArtists });
      // Invalidate specifically the active artist view if they are viewing one
      queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "library" &&
          query.queryKey[1] === "artist",
      });
    });

    eventSource.addEventListener("feed-updated", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.releases });
      queryClient.invalidateQueries({ queryKey: queryKeys.followedArtists });
    });

    eventSource.addEventListener("catalog-updated", () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.releases });
      queryClient.invalidateQueries({ queryKey: queryKeys.followedArtists });
    });

    eventSource.addEventListener("artwork-backfill-updated", (event) => {
      const payload = parseArtworkBackfillEvent(event);

      queryClient.invalidateQueries({ queryKey: queryKeys.artworkBackfillStatus });

      if (payload.status === "completed") {
        queryClient.invalidateQueries({ queryKey: queryKeys.libraryStats });
        queryClient.invalidateQueries({ queryKey: queryKeys.libraryArtists });
        queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey[0] === "library" &&
            query.queryKey[1] === "artist",
        });
      }
    });

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [queryClient]);
};
