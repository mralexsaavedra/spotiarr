import { PlaylistHistory } from "@spotiarr/shared";
import { useQuery } from "@tanstack/react-query";
import { historyService } from "../../services/history.service";
import { queryKeys } from "../queryKeys";

export const useDownloadHistoryQuery = () => {
  return useQuery<PlaylistHistory[]>({
    queryKey: queryKeys.downloadHistory,
    queryFn: () => historyService.getDownloadHistory(),
  });
};
