import {
  ApiRoutes,
  type CreatePlaylistRequest,
  type DownloadStatusResponse,
  type PlaylistPreview,
  type PlaylistPreviewTracksPage,
  type SpotifyPlaylist,
} from "@spotiarr/shared";
import type { Playlist } from "@/types";
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

  getPlaylistPreviewTracksPage: async (
    spotifyUrl: string,
    offset: number,
    limit: number,
  ): Promise<PlaylistPreviewTracksPage> => {
    const params = new URLSearchParams({
      url: spotifyUrl,
      offset: String(offset),
      limit: String(limit),
    });

    return httpClient.get<PlaylistPreviewTracksPage>(
      `${ApiRoutes.PLAYLIST}/preview/tracks?${params.toString()}`,
    );
  },

  createPlaylist: async (input: CreatePlaylistRequest): Promise<Playlist> => {
    try {
      return await httpClient.post<Playlist>(ApiRoutes.PLAYLIST, input);
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
    return httpClient.post<void>(`${ApiRoutes.PLAYLIST}/${playlistId}/retry`);
  },

  deletePlaylist: async (id: string): Promise<void> => {
    return httpClient.delete<void>(`${ApiRoutes.PLAYLIST}/${id}`);
  },
};
