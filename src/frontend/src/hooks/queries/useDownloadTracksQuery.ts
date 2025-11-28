import { DownloadHistoryItem } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";

export const DOWNLOAD_TRACKS_QUERY_KEY = ["downloadTracks"];

export const useDownloadTracksQuery = () => {
  return useQuery<DownloadHistoryItem[]>({
    queryKey: DOWNLOAD_TRACKS_QUERY_KEY,
    queryFn: () => api.getDownloadTracks(),
  });
};
