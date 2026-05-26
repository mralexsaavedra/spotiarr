import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";
import type {
  AlbumIdentityInput,
  ArtistAlbumCacheWithArtist,
  ArtistAlbumSpotifyUrlInput,
  ArtistReleaseCacheWithArtist,
  CatalogIdentity,
  CatalogIdentityInput,
  FeedRepositoryPort,
  SyncStateRecord,
  SyncStatus,
} from "@/application/ports/feed-repository.port";
import { SYNC_STATUS } from "@/application/ports/feed-repository.port";
import type { FeedCacheEvictionService } from "@/application/services/feed-cache-eviction.service";
import type { ArtistAlbumCacheRepository } from "./artist-album-cache.repository";
import type { ArtistReleaseCacheRepository } from "./artist-release-cache.repository";
import type { FeedSyncStateRepository } from "./feed-sync-state.repository";
import type { FollowedArtistRepository } from "./followed-artist.repository";

export { SYNC_STATUS };
export type { CatalogIdentity, SyncStatus };

export class FeedRepository implements FeedRepositoryPort {
  constructor(
    private readonly followedArtistRepository: FollowedArtistRepository,
    private readonly artistAlbumCacheRepository: ArtistAlbumCacheRepository,
    private readonly artistReleaseCacheRepository: ArtistReleaseCacheRepository,
    private readonly feedSyncStateRepository: FeedSyncStateRepository,
    private readonly feedCacheEvictionService: FeedCacheEvictionService,
  ) {}

  getArtistBySpotifyId(spotifyId: string): Promise<FollowedArtist | null> {
    return this.followedArtistRepository.getArtistBySpotifyId(spotifyId);
  }
  getArtistCatalogIdentities(spotifyIds: string[]): Promise<CatalogIdentity[]> {
    return this.followedArtistRepository.getArtistCatalogIdentities(spotifyIds);
  }
  updateArtistCatalogIdentities(identities: CatalogIdentityInput[]): Promise<void> {
    return this.followedArtistRepository.updateArtistCatalogIdentities(identities);
  }
  getReleases(lookbackDays: number): Promise<ArtistRelease[]> {
    return this.artistReleaseCacheRepository.getReleases(lookbackDays);
  }
  getArtists(): Promise<FollowedArtist[]> {
    return this.followedArtistRepository.getArtists();
  }
  upsertArtists(artists: FollowedArtist[]): Promise<void> {
    return this.followedArtistRepository.upsertArtists(artists);
  }
  upsertReleases(releases: ArtistRelease[]): Promise<void> {
    return this.artistReleaseCacheRepository.upsertReleases(releases);
  }
  getArtistAlbumWithArtist(
    spotifyArtistId: string,
    albumId: string,
  ): Promise<ArtistAlbumCacheWithArtist | null> {
    return this.artistAlbumCacheRepository.getArtistAlbumWithArtist(spotifyArtistId, albumId);
  }
  getArtistReleaseWithArtist(
    artistId: string,
    albumId: string,
  ): Promise<ArtistReleaseCacheWithArtist | null> {
    return this.artistReleaseCacheRepository.getArtistReleaseWithArtist(artistId, albumId);
  }
  updateArtistAlbumIdentities(id: string, identities: AlbumIdentityInput): Promise<void> {
    return this.artistAlbumCacheRepository.updateArtistAlbumIdentities(id, identities);
  }
  upsertArtistAlbumSpotifyUrl(input: ArtistAlbumSpotifyUrlInput): Promise<void> {
    return this.artistAlbumCacheRepository.upsertArtistAlbumSpotifyUrl(input);
  }
  updateArtistReleaseSpotifyUrl(
    artistId: string,
    albumId: string,
    spotifyUrl: string,
  ): Promise<void> {
    return this.artistReleaseCacheRepository.updateArtistReleaseSpotifyUrl(
      artistId,
      albumId,
      spotifyUrl,
    );
  }
  getArtistAlbumCount(spotifyArtistId: string): Promise<number> {
    return this.artistAlbumCacheRepository.getArtistAlbumCount(spotifyArtistId);
  }
  getArtistAlbumsFreshness(spotifyArtistId: string): Promise<Date | null> {
    return this.artistAlbumCacheRepository.getArtistAlbumsFreshness(spotifyArtistId);
  }
  getArtistIdsWithNoAlbums(): Promise<Set<string>> {
    return this.followedArtistRepository.getArtistIdsWithNoAlbums();
  }
  getArtistIdsWithFreshAlbums(cutoffDate: Date): Promise<Set<string>> {
    return this.artistAlbumCacheRepository.getArtistIdsWithFreshAlbums(cutoffDate);
  }
  getArtistIdsWithFreshReleases(cutoffDate: Date): Promise<Set<string>> {
    return this.artistReleaseCacheRepository.getArtistIdsWithFreshReleases(cutoffDate);
  }
  getArtistAlbums(
    spotifyArtistId: string,
    limit: number,
    offset?: number,
  ): Promise<ArtistRelease[]> {
    return this.artistAlbumCacheRepository.getArtistAlbums(spotifyArtistId, limit, offset);
  }
  upsertArtistAlbums(albums: ArtistRelease[]): Promise<void> {
    return this.artistAlbumCacheRepository.upsertArtistAlbums(albums);
  }
  evictStaleFeedCache(artistIds: string[], cutoffDays?: number): Promise<void> {
    return this.feedCacheEvictionService.evictStaleFeedCache(artistIds, cutoffDays);
  }
  getArtistIdsNeedingCatalogSync(cutoffDate: Date, limit: number): Promise<string[]> {
    return this.followedArtistRepository.getArtistIdsNeedingCatalogSync(cutoffDate, limit);
  }
  getActiveArtistIdsForReleasesSync(
    releaseCutoff: Date,
    activityWindowDate: Date,
    limit: number,
  ): Promise<string[]> {
    return this.followedArtistRepository.getActiveArtistIdsForReleasesSync(
      releaseCutoff,
      activityWindowDate,
      limit,
    );
  }
  updateArtistCatalogSyncedAt(artistIds: string[]): Promise<void> {
    return this.followedArtistRepository.updateArtistCatalogSyncedAt(artistIds);
  }
  updateArtistReleasesSyncedAt(artistIds: string[]): Promise<void> {
    return this.followedArtistRepository.updateArtistReleasesSyncedAt(artistIds);
  }
  getSyncState(): Promise<SyncStateRecord> {
    return this.feedSyncStateRepository.getSyncState();
  }
  setSyncState(status: SyncStatus, error?: string): Promise<void> {
    return this.feedSyncStateRepository.setSyncState(status, error);
  }
  getCatalogSyncState(): Promise<SyncStateRecord> {
    return this.feedSyncStateRepository.getCatalogSyncState();
  }
  setCatalogSyncState(status: SyncStatus, error?: string): Promise<void> {
    return this.feedSyncStateRepository.setCatalogSyncState(status, error);
  }
}
