import {
  ApiRoutes,
  DownloadHistoryItem,
  PlaylistHistory,
  RecentPlayItem,
  RecordPlayInput,
  TopArtistItem,
  TopTrackItem,
} from "@spotiarr/shared";
import type { QueueItem } from "@/store/usePlayerStore";
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

  recordPlay: async (item: QueueItem): Promise<void> => {
    const input: RecordPlayInput = {
      trackId: item.id ?? null,
      trackUrl: item.audioUrl ?? null,
      trackName: item.name,
      artist: item.artist,
      album: item.album ?? null,
      albumCoverUrl: item.artworkUrl ?? null,
      durationMs: item.durationMs ?? null,
      playedAt: Date.now(),
    };
    await httpClient.post<void>(`${ApiRoutes.HISTORY}/plays`, input);
  },

  getTopTracks: async (limit: number = 10): Promise<TopTrackItem[]> => {
    const response = await httpClient.get<{ data: TopTrackItem[] }>(
      `${ApiRoutes.HISTORY}/top-tracks?limit=${limit}`,
    );
    return response.data;
  },

  getTopArtists: async (limit: number = 10): Promise<TopArtistItem[]> => {
    const response = await httpClient.get<{ data: TopArtistItem[] }>(
      `${ApiRoutes.HISTORY}/top-artists?limit=${limit}`,
    );
    return response.data;
  },

  getRecentPlays: async (limit: number = 20): Promise<RecentPlayItem[]> => {
    const response = await httpClient.get<{ data: RecentPlayItem[] }>(
      `${ApiRoutes.HISTORY}/recent-plays?limit=${limit}`,
    );
    return response.data;
  },
};
