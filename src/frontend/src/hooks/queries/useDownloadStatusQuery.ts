import { DownloadStatusResponse } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../services/api";
import { DOWNLOAD_STATUS_QUERY_KEY } from "../queryKeys";

export const useDownloadStatusQuery = () => {
  return useQuery<DownloadStatusResponse>({
    queryKey: DOWNLOAD_STATUS_QUERY_KEY,
    queryFn: () => api.getDownloadStatus(),
    staleTime: Infinity, // Keep data fresh until invalidated
  });
};
