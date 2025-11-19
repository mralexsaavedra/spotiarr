export interface Playlist {
  id: number;
  name?: string;
  type?: 'playlist' | 'album' | 'track';
  spotifyUrl: string;
  error?: string;
  active: boolean;
  createdAt: number;
}
