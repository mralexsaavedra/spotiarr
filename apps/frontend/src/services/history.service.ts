import { ApiRoutes, DownloadHistoryItem, PlaylistHistory, RecordPlayInput } from "@spotiarr/shared";
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
};
