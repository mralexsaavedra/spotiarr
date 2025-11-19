export interface Track {
  id: number;
  artist: string;
  name: string;
  spotifyUrl: string;
  trackUrl?: string;
  artists?: { name: string; url: string }[];
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
