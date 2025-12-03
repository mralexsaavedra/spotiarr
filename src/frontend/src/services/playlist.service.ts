import { DownloadStatusResponse, PlaylistPreview } from "@spotiarr/shared";
import { Playlist } from "../types/playlist";
import { httpClient } from "./httpClient";

export const playlistService = {
  getPlaylists: async (): Promise<Playlist[]> => {
    const response = await httpClient.get<{ data: Playlist[] }>("/playlist");
    return response.data;
  },

  getDownloadStatus: async (): Promise<DownloadStatusResponse> => {
    return httpClient.get<DownloadStatusResponse>("/playlist/status");
  },

  getPlaylistPreview: async (spotifyUrl: string): Promise<PlaylistPreview> => {
    return httpClient.get<PlaylistPreview>(
      `/playlist/preview?url=${encodeURIComponent(spotifyUrl)}`,
    );
  },

  createPlaylist: async (spotifyUrl: string): Promise<Playlist> => {
    try {
      return await httpClient.post<Playlist>("/playlist", { spotifyUrl });
    } catch (error: any) {
      if (error.code === "invalid_playlist_payload") {
        throw new Error("invalid_playlist_payload");
      }
      throw error;
    }
  },

  updatePlaylist: async (id: string, data: Partial<Playlist>): Promise<void> => {
    try {
      await httpClient.put<void>(`/playlist/${id}`, data);
    } catch (error: any) {
      if (error.code === "invalid_playlist_payload") {
        throw new Error("invalid_playlist_payload");
      }
      throw error;
    }
  },

  retryFailedTracks: async (playlistId: string): Promise<void> => {
    return httpClient.get<void>(`/playlist/retry/${playlistId}`);
  },

  deletePlaylist: async (id: string): Promise<void> => {
    return httpClient.delete<void>(`/playlist/${id}`);
  },

  deleteCompletedPlaylists: async (): Promise<void> => {
    return httpClient.delete<void>("/playlist/completed");
  },
};
