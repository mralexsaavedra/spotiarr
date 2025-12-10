import { ApiRoutes } from "@spotiarr/shared";
import { Track } from "@/types";
import { httpClient } from "./httpClient";

export const trackService = {
  getTracksByPlaylist: async (playlistId: string): Promise<Track[]> => {
    const response = await httpClient.get<{ data: Track[] }>(
      `${ApiRoutes.TRACK}/playlist/${playlistId}`,
    );
    return response.data;
  },

  retryTrack: async (id: string): Promise<void> => {
    return httpClient.get<void>(`${ApiRoutes.TRACK}/retry/${id}`);
  },

  deleteTrack: async (id: string): Promise<void> => {
    return httpClient.delete<void>(`${ApiRoutes.TRACK}/${id}`);
  },
};
