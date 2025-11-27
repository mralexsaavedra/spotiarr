import { PlaylistHistory } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { DOWNLOAD_HISTORY_QUERY_KEY } from "../queryKeys";

export const useDownloadHistoryQuery = () => {
  return useQuery<PlaylistHistory[]>({
    queryKey: DOWNLOAD_HISTORY_QUERY_KEY,
    queryFn: () => api.getDownloadHistory(),
  });
};
