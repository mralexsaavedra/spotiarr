export interface Playlist {
  id: number;
  name?: string;
  type?: 'playlist' | 'album' | 'track';
  spotifyUrl: string;
  error?: string;
  active: boolean;
  createdAt: number;
  coverUrl?: string;
  artistImageUrl?: string;
  collapsed?: boolean; // UI state
}

export enum PlaylistStatusEnum {
  InProgress,
  Completed,
  Warning,
  Error,
  Subscribed,
}
