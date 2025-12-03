import { Track } from "../types/track";
import { httpClient } from "./httpClient";

export const trackService = {
  getTracksByPlaylist: async (playlistId: string): Promise<Track[]> => {
    const response = await httpClient.get<{ data: Track[] }>(`/track/playlist/${playlistId}`);
    return response.data;
  },

  retryTrack: async (id: string): Promise<void> => {
    return httpClient.get<void>(`/track/retry/${id}`);
  },

  deleteTrack: async (id: string): Promise<void> => {
    return httpClient.delete<void>(`/track/${id}`);
  },
};
