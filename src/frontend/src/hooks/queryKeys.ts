export const queryKeys = {
  playlists: ["playlists"] as const,
  tracks: (playlistId: string) => ["tracks", playlistId] as const,
  playlistPreview: (spotifyUrl: string) => ["playlist-preview", spotifyUrl] as const,
  downloadHistory: ["download-history"] as const,
  downloadStatus: ["download-status"] as const,
  settings: ["settings"] as const,
  settingsMetadata: ["settingsMetadata"] as const,
  supportedFormats: ["supportedFormats"] as const,
  releases: ["releases"] as const,
  followedArtists: ["followed-artists"] as const,
  artistDetail: (artistId: string) => ["artist-detail", artistId] as const,
  artistAlbums: (artistId: string, limit: number, offset: number) =>
    ["artist-albums", artistId, limit, offset] as const,
} as const;
