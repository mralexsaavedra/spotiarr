export interface SpotifyExternalUrls {
  spotify?: string;
}

export interface SpotifyImage {
  url: string;
}

export interface SpotifyArtist {
  id?: string;
  name: string;
  external_urls?: SpotifyExternalUrls;
}

export interface SpotifyAlbum {
  name: string;
  images?: SpotifyImage[];
  release_date?: string;
  id?: string;
  album_group?: string;
  album_type?: string;
  external_urls?: SpotifyExternalUrls;
  artists?: SpotifyArtist[];
  total_tracks?: number;
}

export interface SpotifyTrack {
  name: string;
  artists: SpotifyArtist[];
  album?: SpotifyAlbum;
  preview_url?: string | null;
  external_urls?: SpotifyExternalUrls;
  track_number?: number;
  duration_ms?: number;
  is_playable?: boolean;
}

export interface SpotifyAlbumTracksResponse {
  items: SpotifyTrack[];
}

export interface SpotifyPlaylistTrackItem {
  track: SpotifyTrack | null;
}

export interface SpotifyArtistTopTracksResponse {
  tracks?: SpotifyTrack[];
}

export interface SpotifyCursor {
  after?: string;
}

export interface SpotifyArtistFull extends SpotifyArtist {
  id: string;
  images?: SpotifyImage[];
}

export interface SpotifyFollowedArtistsPage {
  items: SpotifyArtistFull[];
  next?: string | null;
  cursors?: SpotifyCursor;
}

export interface SpotifyFollowedArtistsResponse {
  artists: SpotifyFollowedArtistsPage;
}

export interface SpotifyArtistAlbumsResponse {
  items: SpotifyAlbum[];
}
