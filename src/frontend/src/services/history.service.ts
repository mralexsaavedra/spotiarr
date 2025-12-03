import { DownloadHistoryItem, PlaylistHistory } from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export const historyService = {
  getDownloadHistory: async (): Promise<PlaylistHistory[]> => {
    const response = await httpClient.get<{ data: PlaylistHistory[] }>("/history/downloads");
    return response.data;
  },

  getDownloadTracks: async (): Promise<DownloadHistoryItem[]> => {
    const response = await httpClient.get<{ data: DownloadHistoryItem[] }>("/history/tracks");
    return response.data;
  },
};
