export const queryKeys = {
  playlists: ["playlists"] as const,
  myPlaylists: ["my-playlists"] as const,
  tracks: (playlistId: string) => ["tracks", playlistId] as const,
  playlistPreview: (spotifyUrl: string) => ["playlist-preview", spotifyUrl] as const,
  playlistPreviewTracksPage: (spotifyUrl: string, offset: number, limit: number) =>
    ["playlist-preview-tracks-page", spotifyUrl, offset, limit] as const,
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
  artistAlbumTracks: (artistId: string, albumId: string) =>
    ["artist-album-tracks", artistId, albumId] as const,
  spotifyAuthStatus: ["spotify-auth-status"] as const,
  library: ["library"] as const,
  libraryStats: ["library", "stats"] as const,
  libraryArtists: ["library", "artists"] as const,
  libraryArtistDetail: (name: string) => ["library", "artist", name] as const,
  search: (query: string, types: string[], limit: number) =>
    ["search", query, types, limit] as const,
} as const;
