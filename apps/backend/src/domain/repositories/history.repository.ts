import type {
  DownloadHistoryItem,
  ITrack,
  RecordPlayInput,
  TopTrackItem,
  TopArtistItem,
  RecentPlayItem,
} from "@spotiarr/shared";

export interface HistoryRepository {
  findAll(limit?: number): Promise<DownloadHistoryItem[]>;

  createFromTrack(track: ITrack): Promise<void>;

  recordPlay(input: RecordPlayInput): Promise<void>;

  getTopTracks(limit: number): Promise<TopTrackItem[]>;

  getTopArtists(limit: number): Promise<TopArtistItem[]>;

  getRecentPlays(limit: number): Promise<RecentPlayItem[]>;
}
