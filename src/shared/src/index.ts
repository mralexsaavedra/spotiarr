export * from "./routes.js";
export const SUPPORTED_AUDIO_FORMATS = [
  "aac",
  "flac",
  "mp3",
  "m4a",
  "opus",
  "vorbis",
  "wav",
  "alac",
] as const;

export type SupportedAudioFormat = (typeof SUPPORTED_AUDIO_FORMATS)[number];

export const APP_LOCALES = ["en", "es"] as const;
export type AppLocale = (typeof APP_LOCALES)[number];

export const APP_LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  es: "Español (España)",
};

export enum PlaylistTypeEnum {
  Playlist = "playlist",
  Album = "album",
  Track = "track",
  Artist = "artist",
}

export enum TrackStatusEnum {
  New = "new",
  Searching = "searching",
  Queued = "queued",
  Downloading = "downloading",
  Completed = "completed",
  Error = "error",
}

export type SettingSection =
  | "General"
  | "Spotify"
  | "Playlists"
  | "Releases"
  | "Downloads"
  | "Maintenance";

export interface SettingMetadata {
  key: string;
  defaultValue: string;
  type: "number" | "boolean" | "string";
  component: "input" | "toggle" | "select";
  section: SettingSection;
  min?: number;
  max?: number;
  label: string;
  description: string;
  options?: string[];
  formatLabel?: (value: string) => string;
}

export interface TrackArtist {
  name: string;
  url?: string;
}

export interface ITrack {
  id?: string;
  name: string;
  artist: string;
  album?: string;
  albumYear?: number;
  trackNumber?: number;
  spotifyUrl?: string;
  trackUrl?: string;
  albumUrl?: string;
  durationMs?: number;
  artists?: TrackArtist[];
  youtubeUrl?: string;
  status?: TrackStatusEnum;
  error?: string;
  createdAt?: number;
  completedAt?: number;
  playlistId?: string;
}

export interface IPlaylist {
  id: string;
  name?: string;
  type?: PlaylistTypeEnum;
  spotifyUrl: string;
  error?: string;
  subscribed?: boolean;
  createdAt?: number;
  coverUrl?: string;
  artistImageUrl?: string;
  description?: string;

  tracks?: ITrack[];
  owner?: string;
  ownerUrl?: string;
}

export type AlbumType = "album" | "single" | "compilation";

export interface ArtistRelease {
  artistId: string;
  artistName: string;
  artistImageUrl: string | null;
  albumId: string;
  albumName: string;
  albumType?: AlbumType;
  releaseDate?: string;
  coverUrl: string | null;
  spotifyUrl?: string;
  totalTracks?: number;
}

export type ApiErrorCode =
  | "missing_user_access_token"
  | "spotify_rate_limited"
  | "failed_to_fetch_releases"
  | "invalid_playlist_payload"
  | "invalid_setting_payload"
  | "invalid_spotify_url"
  | "missing_spotify_client_id"
  | "missing_code"
  | "missing_spotify_credentials"
  | "spotify_token_exchange_failed"
  | "playlist_not_found"
  | "playlist_already_exists"
  | "track_not_found"
  | "internal_server_error"
  | "failed_to_fetch_artist_detail"
  | "failed_to_fetch_followed_artists";

export interface ApiErrorShape {
  error: ApiErrorCode;
  message?: string;
}

export interface ApiSuccess<T> {
  data: T;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorShape;

export interface DownloadHistoryItem {
  id: string;
  playlistId: string | null;
  playlistName: string;
  playlistSpotifyUrl: string | null;
  trackId: string | null;
  trackName: string;
  artist: string;
  album: string | null;
  trackUrl: string | null;
  completedAt: number;
}

export interface PlaylistHistory {
  playlistId: string | null;
  playlistName: string;
  playlistSpotifyUrl: string | null;
  trackCount: number;
  lastCompletedAt: number;
}

export interface PlaylistPreview {
  name: string;
  type: string;
  description: string | null;
  coverUrl: string | null;
  totalTracks: number;
  owner?: string;
  ownerUrl?: string;
  tracks: Array<{
    name: string;
    artists: { name: string; url?: string }[];
    album: string;
    duration: number;
    trackUrl?: string;
    albumUrl?: string;
  }>;
}

export interface ArtistTopTrack {
  name: string;
  artist: string;
  primaryArtist?: string;
  primaryArtistImage: string | null;
  artists: { name: string; url?: string }[];
  trackUrl?: string;
  album?: string;
  albumCoverUrl?: string;
  albumYear?: number;
  trackNumber: number;
  previewUrl?: string | null;
  durationMs?: number;
}

export interface ArtistDetail {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl?: string | null;
  followers?: number | null;
  popularity?: number | null;
  genres?: string[];
  topTracks: ArtistTopTrack[];
  albums: ArtistRelease[];
}

export interface SettingItem {
  key: string;
  value: string;
  updatedAt?: string;
}

export enum PlaylistStatusEnum {
  New = "new",
  Downloading = "downloading",
  Completed = "completed",
  Error = "error",
  Warning = "warning",
  Subscribed = "subscribed",
  InProgress = "in_progress",
}

export interface DownloadStatusResponse {
  playlistStatusMap: Record<string, PlaylistStatusEnum>;
  trackStatusMap: Record<string, TrackStatusEnum>;
  albumTrackCountMap: Record<string, number>;
}

export interface FollowedArtist {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl: string | null;
}

export type NormalizedTrack = ITrack & {
  primaryArtist?: string;
  primaryArtistImage?: string | null;
  albumCoverUrl?: string;
  previewUrl?: string | null;
  artists: { name: string; url: string | undefined }[];
  unavailable?: boolean;
};

export interface SpotifyPlaylist {
  id: string;
  name: string;
  image: string | null;
  owner: string;
  tracks: number;
  spotifyUrl: string;
  ownerUrl?: string;
}
