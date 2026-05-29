import { ArtworkBackfillStatusResponse } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { fetchArtworkBackfillStatus } from "@/services/artworkBackfill.service";
import { queryKeys } from "../queryKeys";

const ACTIVE_STATUSES = new Set(["running", "pause_requested", "paused", "paused_rate_limited"]);

export const useArtworkBackfillStatusQuery = () => {
  return useQuery<ArtworkBackfillStatusResponse, Error>({
    queryKey: queryKeys.artworkBackfillStatus,
    queryFn: fetchArtworkBackfillStatus,
    refetchInterval: (query) =>
      ACTIVE_STATUSES.has(query.state.data?.status ?? "idle") ? 5000 : false,
  });
};
