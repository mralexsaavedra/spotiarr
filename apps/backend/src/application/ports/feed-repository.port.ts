import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";

export interface CatalogIdentity {
  spotifyId: string;
  deezerId: string | null;
  mbid: string | null;
}

export interface CatalogIdentityInput {
  spotifyId: string;
  deezerId?: string | null;
  mbid?: string | null;
}

export interface ArtistAlbumSpotifyUrlInput {
  artistId: string;
  albumId: string;
  albumName: string;
  albumType?: string | null;
  releaseDate?: string | null;
  coverUrl?: string | null;
  spotifyUrl: string;
  totalTracks?: number | null;
}

export interface AlbumIdentityInput {
  deezerAlbumId?: string | null;
  mbAlbumId?: string | null;
}

export const SYNC_STATUS = {
  Idle: "idle",
  Running: "running",
  Error: "error",
} as const;

export type SyncStatus = (typeof SYNC_STATUS)[keyof typeof SYNC_STATUS];

export interface SyncStateRecord {
  id: number;
  lastSyncAt: Date | null;
  status: string;
  error: string | null;
}

export interface ArtistAlbumCacheWithArtist {
  id: string;
  spotifyArtistId: string;
  albumId: string;
  albumName: string;
  albumType: string | null;
  releaseDate: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null;
  totalTracks: number | null;
  deezerAlbumId: string | null;
  mbAlbumId: string | null;
  artistName: string;
}

export interface ArtistReleaseCacheWithArtist {
  id: string;
  artistId: string;
  albumId: string;
  albumName: string;
  albumType: string | null;
  releaseDate: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null;
  artistName: string;
}

export interface FeedRepositoryPort {
  getArtistBySpotifyId(spotifyId: string): Promise<FollowedArtist | null>;
  getArtistByAnyId(id: string): Promise<FollowedArtist | null>;
  getArtistCatalogIdentities(spotifyIds: string[]): Promise<CatalogIdentity[]>;
  updateArtistCatalogIdentities(identities: CatalogIdentityInput[]): Promise<void>;
  getReleases(lookbackDays: number): Promise<ArtistRelease[]>;
  getArtists(): Promise<FollowedArtist[]>;
  upsertArtists(artists: FollowedArtist[]): Promise<void>;
  upsertReleases(releases: ArtistRelease[]): Promise<void>;
  getArtistAlbumWithArtist(
    spotifyArtistId: string,
    albumId: string,
  ): Promise<ArtistAlbumCacheWithArtist | null>;
  getArtistReleaseWithArtist(
    artistId: string,
    albumId: string,
  ): Promise<ArtistReleaseCacheWithArtist | null>;
  updateArtistAlbumIdentities(id: string, identities: AlbumIdentityInput): Promise<void>;
  upsertArtistAlbumSpotifyUrl(input: ArtistAlbumSpotifyUrlInput): Promise<void>;
  updateArtistReleaseSpotifyUrl(
    artistId: string,
    albumId: string,
    spotifyUrl: string,
  ): Promise<void>;
  getArtistAlbumCount(spotifyArtistId: string): Promise<number>;
  getArtistAlbumsFreshness(spotifyArtistId: string): Promise<Date | null>;
  getArtistIdsWithNoAlbums(): Promise<Set<string>>;
  getArtistIdsWithFreshAlbums(cutoffDate: Date): Promise<Set<string>>;
  getArtistIdsWithFreshReleases(cutoffDate: Date): Promise<Set<string>>;
  getArtistAlbums(
    spotifyArtistId: string,
    limit: number,
    offset?: number,
  ): Promise<ArtistRelease[]>;
  upsertArtistAlbums(albums: ArtistRelease[]): Promise<void>;
  evictStaleFeedCache(artistIds: string[], cutoffDays?: number): Promise<void>;
  getArtistIdsNeedingCatalogSync(cutoffDate: Date, limit: number): Promise<string[]>;
  getActiveArtistIdsForReleasesSync(
    releaseCutoff: Date,
    activityWindowDate: Date,
    limit: number,
  ): Promise<string[]>;
  updateArtistCatalogSyncedAt(artistIds: string[]): Promise<void>;
  updateArtistReleasesSyncedAt(artistIds: string[]): Promise<void>;
  getSyncState(): Promise<SyncStateRecord>;
  setSyncState(status: SyncStatus, error?: string): Promise<void>;
  getCatalogSyncState(): Promise<SyncStateRecord>;
  setCatalogSyncState(status: SyncStatus, error?: string): Promise<void>;
}
