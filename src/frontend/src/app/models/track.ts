export interface Track {
  id: number;
  artist: string;
  name: string;
  spotifyUrl: string;
  trackUrl?: string;
  artistUrl?: string;
  youtubeUrl: string;
  status: TrackStatusEnum;
  playlistId?: number;
  error?: string;
}

export enum TrackStatusEnum {
  New,
  Searching,
  Queued,
  Downloading,
  Completed,
  Error,
}
