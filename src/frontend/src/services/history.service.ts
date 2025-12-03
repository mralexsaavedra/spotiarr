import { ApiRoutes, DownloadHistoryItem, PlaylistHistory } from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export const historyService = {
  getDownloadHistory: async (): Promise<PlaylistHistory[]> => {
    const response = await httpClient.get<{ data: PlaylistHistory[] }>(
      `${ApiRoutes.HISTORY}/downloads`,
    );
    return response.data;
  },

  getDownloadTracks: async (): Promise<DownloadHistoryItem[]> => {
    const response = await httpClient.get<{ data: DownloadHistoryItem[] }>(
      `${ApiRoutes.HISTORY}/tracks`,
    );
    return response.data;
  },
};
