import type { IPlaylist, ITrack, LibraryArtist } from "@spotiarr/shared";

export interface TrackTags {
  title: string;
  artist: string;
  albumArtist?: string;
  album?: string;
  albumYear?: number;
  trackNumber?: number;
  discNumber?: number;
  totalTracks?: number;
  coverUrl?: string;
}

export interface FileSystemTrackPathPort {
  getMusicLibraryPath(): string;
  getFolderName(track: ITrack, playlistName?: string): Promise<string>;
  getPlaylistFolderPath(name: string): string;
  getArtistFolderPath(artist: string): string;
  ensureParentDirectory(filePath: string): Promise<void>;
}

export interface FileSystemScannerPort {
  scanMusicLibrary(libraryPath: string): Promise<LibraryArtist[]>;
}

export interface MetadataPort {
  writeTags(filePath: string, tags: TrackTags): Promise<void>;
  saveCoverArt(directory: string, url: string, fileName?: string): Promise<void>;
}

export interface M3uPort {
  generateM3uFile(playlist: IPlaylist, tracks: ITrack[], folder: string): Promise<void>;
  getCompletedTracksCount(tracks: ITrack[]): number;
}
