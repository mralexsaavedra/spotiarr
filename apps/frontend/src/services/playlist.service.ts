import {
  ApiRoutes,
  DownloadStatusResponse,
  PlaylistPreview,
  SpotifyPlaylist,
} from "@spotiarr/shared";
import { Playlist } from "@/types";
import { ApiError, httpClient } from "./httpClient";

export const playlistService = {
  getPlaylists: async (): Promise<Playlist[]> => {
    const response = await httpClient.get<{ data: Playlist[] }>(ApiRoutes.PLAYLIST);
    return response.data;
  },

  getMyPlaylists: async (): Promise<SpotifyPlaylist[]> => {
    return httpClient.get<SpotifyPlaylist[]>(`${ApiRoutes.PLAYLIST}/me`);
  },

  getDownloadStatus: async (): Promise<DownloadStatusResponse> => {
    return httpClient.get<DownloadStatusResponse>(`${ApiRoutes.PLAYLIST}/status`);
  },

  getPlaylistPreview: async (spotifyUrl: string): Promise<PlaylistPreview> => {
    const params = new URLSearchParams({ url: spotifyUrl });
    return httpClient.get<PlaylistPreview>(`${ApiRoutes.PLAYLIST}/preview?${params.toString()}`);
  },

  createPlaylist: async (spotifyUrl: string): Promise<Playlist> => {
    try {
      return await httpClient.post<Playlist>(ApiRoutes.PLAYLIST, { spotifyUrl });
    } catch (error) {
      if (error instanceof ApiError && error.code === "invalid_playlist_payload") {
        throw new ApiError("invalid_playlist_payload", "invalid_playlist_payload");
      }
      throw error;
    }
  },

  updatePlaylist: async (id: string, data: Partial<Playlist>): Promise<void> => {
    try {
      await httpClient.put<void>(`${ApiRoutes.PLAYLIST}/${id}`, data);
    } catch (error) {
      if (error instanceof ApiError && error.code === "invalid_playlist_payload") {
        throw new ApiError("invalid_playlist_payload", "invalid_playlist_payload");
      }
      throw error;
    }
  },

  retryFailedTracks: async (playlistId: string): Promise<void> => {
    return httpClient.get<void>(`${ApiRoutes.PLAYLIST}/retry/${playlistId}`);
  },

  deletePlaylist: async (id: string): Promise<void> => {
    return httpClient.delete<void>(`${ApiRoutes.PLAYLIST}/${id}`);
  },

  deleteCompletedPlaylists: async (): Promise<void> => {
    return httpClient.delete<void>(`${ApiRoutes.PLAYLIST}/completed`);
  },
};
