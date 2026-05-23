import type { NormalizedTrack } from "@spotiarr/shared";

export interface SpotifyAlbumTracksPort {
  getAlbumTracks(albumId: string): Promise<NormalizedTrack[]>;
}

export interface DeezerAlbumPort {
  searchAlbum(artist: string, album: string): Promise<{ id: string | number } | null>;
  getAlbumTracks(id: string | number): Promise<NormalizedTrack[]>;
}

export interface MusicBrainzReleasePort {
  getReleaseTracks(id: string): Promise<NormalizedTrack[]>;
}
