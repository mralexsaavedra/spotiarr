import { DownloadStatusResponse } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { playlistService } from "../../services/playlist.service";
import { queryKeys } from "../queryKeys";

export const useDownloadStatusQuery = () => {
  return useQuery<DownloadStatusResponse>({
    queryKey: queryKeys.downloadStatus,
    queryFn: () => playlistService.getDownloadStatus(),
    staleTime: Infinity, // Keep data fresh until invalidated
  });
};
