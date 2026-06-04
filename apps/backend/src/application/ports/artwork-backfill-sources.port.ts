export interface ArtworkBackfillCandidate {
  type: "artist" | "album";
  cursorValue: string;
  artistName: string;
  albumName?: string;
  artistSpotifyId?: string | null;
  albumSpotifyId?: string | null;
}

export interface ArtworkBackfillCandidateSourcePort {
  getArtistCandidates(
    limit: number,
    cursorValue?: string | null,
  ): Promise<ArtworkBackfillCandidate[]>;
  getAlbumCandidates(
    limit: number,
    cursorValue?: string | null,
  ): Promise<ArtworkBackfillCandidate[]>;
}

export interface ArtworkBackfillFileSystemSourcePort {
  hasArtistArtwork(artistName: string): Promise<boolean>;
  hasAlbumArtwork(artistName: string, albumName: string): Promise<boolean>;
  findArtistAlbumArtwork(artistName: string): Promise<string | null>;
  writeArtistArtworkIfMissing(artistName: string, imageUrl: string): Promise<boolean>;
  writeAlbumArtworkIfMissing(
    artistName: string,
    albumName: string,
    imageUrl: string,
  ): Promise<boolean>;
  listAlbumTrackPaths(artistName: string, albumName: string): Promise<string[]>;
}

export interface ArtworkBackfillEmbeddedSourcePort {
  extractFromTracks(trackPaths: string[]): Promise<string | null>;
}

export interface ArtworkBackfillCacheSourcePort {
  findArtistImageUrl(candidate: ArtworkBackfillCandidate): Promise<string | null>;
  findAlbumCoverUrl(candidate: ArtworkBackfillCandidate): Promise<string | null>;
}

export interface ArtworkBackfillExternalSourcePort {
  findArtistImageUrl(candidate: ArtworkBackfillCandidate): Promise<string | null>;
  findAlbumCoverUrl(candidate: ArtworkBackfillCandidate): Promise<string | null>;
}
