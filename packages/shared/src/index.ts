export * from "./routes.js";
export * from "./identity.js";

export const AI_PROVIDERS = [
  "openai",
  "gemini",
  "openrouter",
  "groq",
  "nvidia",
  "ollama",
  "ollama-cloud",
  "lmstudio",
  "vercel",
  "custom",
] as const;

export type AiProvider = (typeof AI_PROVIDERS)[number];

export const AI_PROVIDER_PRESETS: Record<AiProvider, string> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai/",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
  nvidia: "https://integrate.api.nvidia.com/v1",
  ollama: "http://localhost:11434/v1",
  "ollama-cloud": "https://ollama.com/v1",
  lmstudio: "http://localhost:1234/v1",
  vercel: "https://ai-gateway.vercel.sh/v1",
  custom: "",
};

export const AI_LOCAL_PROVIDERS: readonly AiProvider[] = ["ollama", "lmstudio"];

export const DEFAULT_AI_PROVIDER: AiProvider = "openai";

export function normalizeAiProvider(value: string | undefined | null): AiProvider {
  return value && (AI_PROVIDERS as readonly string[]).includes(value)
    ? (value as AiProvider)
    : DEFAULT_AI_PROVIDER;
}

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

export const DEFAULT_AUDIO_FORMAT = "mp3" satisfies SupportedAudioFormat;

export const UI_SUPPORTED_AUDIO_FORMATS = [
  "mp3",
  "m4a",
] as const satisfies readonly SupportedAudioFormat[];

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
  Ai = "ai",
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
  | "Maintenance"
  | "AI";

export interface SettingMetadata {
  key: string;
  defaultValue: string;
  type: "number" | "boolean" | "string";
  component: "input" | "toggle" | "select" | "textarea";
  section: SettingSection;
  min?: number;
  max?: number;
  label: string;
  description: string;
  options?: string[];
  formatLabel?: (value: string) => string;
  secret?: boolean;
}

export type AiPlaylistStage = "llm" | "validating" | "saving" | "done" | "error";

export type AiPlaylistErrorCode =
  | "provider-misconfig"
  | "provider-unreachable"
  | "provider-auth"
  | "provider-forbidden"
  | "llm-bad-output"
  | "zero-resolved";

export interface AiPlaylistProgressEvent {
  jobId: string;
  stage: AiPlaylistStage;
  progress: number;
  resolvedCount?: number;
  droppedTitles?: string[];
  playlistId?: string;
  playlistName?: string;
  error?: {
    code: AiPlaylistErrorCode;
    message: string;
  };
}

export interface GenerateAiPlaylistRequest {
  prompt: string;
}

export interface GenerateAiPlaylistResponse {
  jobId: string;
}

export interface TrackArtist {
  name: string;
  url?: string;
}

export interface ITrack {
  id?: string;
  name: string;
  artist: string;
  albumArtist?: string;
  album?: string;
  albumYear?: number;
  trackNumber?: number;
  discNumber?: number;
  totalTracks?: number;
  spotifyUrl?: string;
  trackUrl?: string;
  audioUrl?: string;
  albumUrl?: string;
  /** Pre-fetched album cover URL. Present on Deezer-origin tracks; used to skip Spotify artwork resolution. */
  albumCoverUrl?: string | null;
  durationMs?: number;
  artists?: TrackArtist[];
  youtubeUrl?: string;
  status?: TrackStatusEnum;
  error?: string;
  createdAt?: number;
  completedAt?: number;
  playlistId?: string;
  playlistIndex?: number;
  searchAttempts?: number;
}

export interface IPlaylist {
  id: string;
  name?: string;
  type?: PlaylistTypeEnum;
  spotifyUrl?: string;
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

export type AlbumType = "album" | "single" | "ep" | "compilation";

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

export type CreatePlaylistRequest =
  | { kind: "spotifyUrl"; spotifyUrl: string }
  | { kind: "album"; artistId: string; albumId: string }
  | { kind: "albumTrack"; artistId: string; albumId: string; trackIndex: number }
  | { kind: "deezerTrack"; deezerTrackId: string; deezerAlbumId: string }
  | { kind: "playlistTrack"; parentSpotifyUrl: string; trackUrl: string };

export type ApiErrorCode =
  | "missing_user_access_token"
  | "spotify_rate_limited"
  | "failed_to_fetch_releases"
  | "validation_error"
  | "invalid_request"
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
  | "album_not_found"
  | "file_not_found"
  | "missing_artist_id"
  | "missing_params"
  | "spotify_album_url_not_found"
  | "internal_server_error"
  | "failed_to_fetch_artist_detail"
  | "failed_to_fetch_followed_artists"
  | "playlist_not_accessible"
  | "rate_limiter_overflow"
  | "circuit_open"
  | "interactive_timeout"
  | "unauthorized"
  | "invalid_token";

export interface ApiErrorShape {
  error: ApiErrorCode;
  message?: string;
}

export interface ApiSuccess<T> {
  data: T;
}

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

export interface PlaylistPreviewTracksPage {
  tracks: PlaylistPreview["tracks"];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export interface ArtistDetail {
  id: string;
  name: string;
  image: string | null;
  spotifyUrl?: string | null;
  followers?: number | null;
  genres?: string[];
  albums: ArtistRelease[];
  isFollowed: boolean;
  catalogRefreshPending?: boolean;
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
  /**
   * Stable internal identifier.
   * Equals the Spotify ID when the artist was synced from a Spotify follow.
   * Equals the Deezer ID transiently for Deezer-only search results that have
   * not yet been persisted to FollowedArtistCache.
   */
  id: string;
  name: string;
  image: string | null;
  /**
   * Spotify profile URL.
   * null when the artist was resolved exclusively via Deezer (unfollowed artist).
   * undefined when the value has not been fetched yet (lazy resolution pending).
   */
  spotifyUrl: string | null | undefined;
}

export type NormalizedTrack = ITrack & {
  primaryArtist?: string;
  primaryArtistImage?: string | null;
  albumCoverUrl?: string | null;
  previewUrl?: string | null;
  artists: { name: string; url: string | undefined }[];
  unavailable?: boolean;
  /** Deezer album ID — present on Deezer-origin tracks for download routing via album path (D4) */
  albumId?: string;
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

export interface LibraryTrack {
  fileName: string;
  filePath: string;
  trackNumber?: number;
  discNumber?: number;
  name: string;
  artist: string;
  album: string;
  duration?: number;
  format: string;
  size: number;
  modifiedAt: number;
}

export interface LibraryAlbum {
  name: string;
  path: string;
  artist: string;
  trackCount: number;
  totalSize: number;
  year?: number;
  image?: string;
  tracks: LibraryTrack[];
}

export interface LibraryArtist {
  name: string;
  path: string;
  albumCount: number;
  trackCount: number;
  totalSize: number;
  image?: string;
  albums: LibraryAlbum[];
}

export interface LibraryScanResult {
  artists: LibraryArtist[];
  totalArtists: number;
  totalAlbums: number;
  totalTracks: number;
  totalSize: number;
  lastScannedAt: number;
  scanDuration: number;
}

export interface LibraryStats {
  totalArtists: number;
  totalAlbums: number;
  totalTracks: number;
  totalSize: number;
  lastScannedAt: number | null;
}

export interface SpotifySearchResults {
  tracks: NormalizedTrack[];
  albums: ArtistRelease[];
  artists: FollowedArtist[];
}

export type ArtworkBackfillRunStatus =
  | "idle"
  | "running"
  | "pause_requested"
  | "paused"
  | "paused_rate_limited"
  | "completed"
  | "error";

export interface ArtworkBackfillStatusResponse {
  runId: string | null;
  status: ArtworkBackfillRunStatus;
  phase: "artists" | "albums" | null;
  totals: number;
  processed: number;
  skippedExisting: number;
  written: number;
  failed: number;
  externalCalls: number;
  lastCheckpoint: string | null;
  rateLimitUntil: string | null;
  updatedAt: string | null;
}

export interface ArtworkBackfillStartResponse {
  runId: string;
  status: "running";
}

export interface UnlockRequestDto {
  token: string;
}

// AI Chat History

export type AiChatRole = "user" | "assistant";

export interface AiChatMessageContent {
  key: string;
  params?: Record<string, unknown>;
}

export interface AiChatMessageDto {
  id: string;
  role: AiChatRole;
  content: AiChatMessageContent;
  playlistId: string | null;
  errorCode: string | null;
  createdAt: number; // epoch ms as JS number
}

export interface AiChatHistoryDto {
  messages: AiChatMessageDto[];
}

export interface ClearChatMessagesResponseDto {
  deleted: number;
}

export interface AuthSessionResponseDto {
  tokenRequired: boolean;
}
