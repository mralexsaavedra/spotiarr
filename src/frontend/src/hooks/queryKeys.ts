export const PLAYLISTS_QUERY_KEY = ["playlists"] as const;

export const tracksQueryKey = (playlistId: string) => ["tracks", playlistId] as const;

export const playlistPreviewQueryKey = (spotifyUrl: string) =>
  ["playlist-preview", spotifyUrl] as const;

export const DOWNLOAD_HISTORY_QUERY_KEY = ["download-history"] as const;

export const SETTINGS_QUERY_KEY = ["settings"] as const;

export const SETTINGS_METADATA_QUERY_KEY = ["settingsMetadata"] as const;

export const SUPPORTED_FORMATS_QUERY_KEY = ["supportedFormats"] as const;

export const RELEASES_QUERY_KEY = ["releases"] as const;

export const FOLLOWED_ARTISTS_QUERY_KEY = ["followed-artists"] as const;

export const artistDetailQueryKey = (artistId: string) => ["artist-detail", artistId] as const;

export const artistAlbumsQueryKey = (artistId: string, limit: number, offset: number) =>
  ["artist-albums", artistId, limit, offset] as const;

export const DOWNLOAD_STATUS_QUERY_KEY = ["download-status"] as const;
