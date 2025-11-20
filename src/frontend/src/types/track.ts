export interface Track {
  id: number;
  name: string;
  artist: string;
  albumYear?: number;
  youtubeUrl?: string;
  error?: string;
  status: TrackStatus;
  playlistId: number;
  createdAt: number;
}

export enum TrackStatus {
  New = 0,
  Searching = 1,
  Queued = 2,
  Downloading = 3,
  Completed = 4,
  Error = 5,
}
