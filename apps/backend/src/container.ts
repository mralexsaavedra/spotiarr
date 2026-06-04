import type { FeedRepositoryPort } from "./application/ports/feed-repository.port";
import type { SpotifyUserLibraryPort } from "./application/ports/spotify-user-library.port";
import { ArtworkService } from "./application/services/artwork.service";
import { FeedCacheEvictionService } from "./application/services/feed-cache-eviction.service";
import { HealthService } from "./application/services/health.service";
import { LibraryService } from "./application/services/library.service";
import { PlaylistService } from "./application/services/playlist.service";
import { SettingsService } from "./application/services/settings.service";
import { SpotifyService } from "./application/services/spotify.service";
import { TrackPostProcessingService } from "./application/services/track-post-processing.service";
import { TrackService } from "./application/services/track.service";
import { GetAlbumTracksUseCase } from "./application/use-cases/artists/get-album-tracks.use-case";
import { GetArtistAlbumsUseCase } from "./application/use-cases/artists/get-artist-albums.use-case";
import { GetArtistDetailUseCase } from "./application/use-cases/artists/get-artist-detail.use-case";
import { GetArtworkBackfillStatusUseCase } from "./application/use-cases/artwork-backfill/get-artwork-backfill-status.use-case";
import { PauseArtworkBackfillUseCase } from "./application/use-cases/artwork-backfill/pause-artwork-backfill.use-case";
import { ProcessArtworkBackfillBatchUseCase } from "./application/use-cases/artwork-backfill/process-artwork-backfill-batch.use-case";
import { ResumeArtworkBackfillUseCase } from "./application/use-cases/artwork-backfill/resume-artwork-backfill.use-case";
import { StartArtworkBackfillUseCase } from "./application/use-cases/artwork-backfill/start-artwork-backfill.use-case";
import { GetRecentReleasesUseCase } from "./application/use-cases/feed/get-recent-releases.use-case";
import { HistoryUseCases } from "./application/use-cases/history/history.use-cases";
import { ScanLibraryUseCase } from "./application/use-cases/library/scan-library.use-case";
import { CreatePlaylistUseCase } from "./application/use-cases/playlists/create-playlist.use-case";
import { DeletePlaylistUseCase } from "./application/use-cases/playlists/delete-playlist.use-case";
import { GetMyPlaylistsUseCase } from "./application/use-cases/playlists/get-my-playlists.use-case";
import { GetPlaylistPreviewTracksPageUseCase } from "./application/use-cases/playlists/get-playlist-preview-tracks-page.use-case";
import { GetPlaylistPreviewUseCase } from "./application/use-cases/playlists/get-playlist-preview.use-case";
import { GetPlaylistsUseCase } from "./application/use-cases/playlists/get-playlists.use-case";
import { GetSystemStatusUseCase } from "./application/use-cases/playlists/get-system-status.use-case";
import { RetryPlaylistDownloadsUseCase } from "./application/use-cases/playlists/retry-playlist-downloads.use-case";
import { SyncSubscribedPlaylistsUseCase } from "./application/use-cases/playlists/sync-subscribed-playlists.use-case";
import { UpdatePlaylistUseCase } from "./application/use-cases/playlists/update-playlist.use-case";
import { GetSettingsUseCase } from "./application/use-cases/settings/get-settings.use-case";
import { UpdateSettingUseCase } from "./application/use-cases/settings/update-setting.use-case";
import { CreateTrackUseCase } from "./application/use-cases/tracks/create-track.use-case";
import { DeleteTrackUseCase } from "./application/use-cases/tracks/delete-track.use-case";
import { DownloadTrackUseCase } from "./application/use-cases/tracks/download-track.use-case";
import { GetTracksUseCase } from "./application/use-cases/tracks/get-tracks.use-case";
import { RescueStuckTracksUseCase } from "./application/use-cases/tracks/rescue-stuck-tracks.use-case";
import { RetryTrackDownloadUseCase } from "./application/use-cases/tracks/retry-track-download.use-case";
import { SearchTrackOnYoutubeUseCase } from "./application/use-cases/tracks/search-track-on-youtube.use-case";
import { UpdateTrackUseCase } from "./application/use-cases/tracks/update-track.use-case";
import { NoopAlbumTracksCache } from "./infrastructure/cache/noop-album-tracks-cache";
import { ArtistAlbumCacheRepository } from "./infrastructure/database/artist-album-cache.repository";
import { ArtistReleaseCacheRepository } from "./infrastructure/database/artist-release-cache.repository";
import { PrismaArtworkBackfillRepository } from "./infrastructure/database/artwork-backfill.repository";
import { FeedCacheEvictionRepository } from "./infrastructure/database/feed-cache-eviction.repository";
import { FeedSyncStateRepository } from "./infrastructure/database/feed-sync-state.repository";
import { FollowedArtistRepository } from "./infrastructure/database/followed-artist.repository";
import { PrismaConnectivityAdapter } from "./infrastructure/database/prisma-connectivity.adapter";
import { PrismaHistoryRepository } from "./infrastructure/database/prisma-history.repository";
import { PrismaPlaylistRepository } from "./infrastructure/database/prisma-playlist.repository";
import { PrismaSettingsRepository } from "./infrastructure/database/prisma-settings.repository";
import { PrismaTrackRepository } from "./infrastructure/database/prisma-track.repository";
import { PromiseCache } from "./infrastructure/external/promise-cache";
import { DeezerClient } from "./infrastructure/external/providers/deezer/deezer.client";
import { MusicBrainzClient } from "./infrastructure/external/providers/musicbrainz/musicbrainz.client";
import { ReleaseFeedService } from "./infrastructure/external/release-feed.service";
import { SpotifyAlbumClient } from "./infrastructure/external/spotify-album.client";
import { SpotifyArtistCatalogService } from "./infrastructure/external/spotify-artist-catalog.service";
import { SpotifyArtistClient } from "./infrastructure/external/spotify-artist.client";
import { SpotifyArtworkSourceService } from "./infrastructure/external/spotify-artwork-source.service";
import { SpotifyAuthService } from "./infrastructure/external/spotify-auth.service";
import { SpotifyCircuitBreakerAdapter } from "./infrastructure/external/spotify-circuit-breaker.adapter";
import { SpotifyFollowedArtistsService } from "./infrastructure/external/spotify-followed-artists.service";
import { SpotifyPlaylistLibraryService } from "./infrastructure/external/spotify-playlist-library.service";
import { SpotifyPlaylistClient } from "./infrastructure/external/spotify-playlist.client";
import { SpotifySearchClient } from "./infrastructure/external/spotify-search.client";
import { SpotifyTrackClient } from "./infrastructure/external/spotify-track.client";
import { YoutubeDownloadService } from "./infrastructure/external/youtube-download.service";
import { YoutubeSearchService } from "./infrastructure/external/youtube-search.service";
import { AppEventBus } from "./infrastructure/messaging/app-event-bus";
import { BullMqArtworkBackfillQueueService } from "./infrastructure/messaging/bullmq-artwork-backfill-queue.service";
import { BullMqTrackQueueService } from "./infrastructure/messaging/bullmq-track-queue.service";
import { ArtworkAssetsService } from "./infrastructure/services/artwork-assets.service";
import { CacheArtworkSourceService } from "./infrastructure/services/cache-artwork-source.service";
import { EmbeddedArtworkSourceService } from "./infrastructure/services/embedded-artwork-source.service";
import { FileSystemArtworkSourceService } from "./infrastructure/services/file-system-artwork-source.service";
import { FileSystemM3uService } from "./infrastructure/services/file-system-m3u.service";
import { FileSystemScannerService } from "./infrastructure/services/file-system-scanner.service";
import { FileSystemTrackPathService } from "./infrastructure/services/file-system-track-path.service";
import { FileSystemLibraryAudioService } from "./infrastructure/services/library-audio.service";
import { FileSystemLibraryImageService } from "./infrastructure/services/library-image.service";
import { MetadataService } from "./infrastructure/services/metadata.service";
import { getEnv } from "./infrastructure/setup/environment";
import { prisma } from "./infrastructure/setup/prisma";
import { ArtistController } from "./presentation/controllers/artist.controller";
import { ArtworkBackfillController } from "./presentation/controllers/artwork-backfill.controller";
import { AuthController } from "./presentation/controllers/auth.controller";
import { EventsController } from "./presentation/controllers/events.controller";
import { FeedController } from "./presentation/controllers/feed.controller";
import { HealthController } from "./presentation/controllers/health.controller";
import { HistoryController } from "./presentation/controllers/history.controller";
import { LibraryController } from "./presentation/controllers/library.controller";
import { PlaylistController } from "./presentation/controllers/playlist.controller";
import { SearchController } from "./presentation/controllers/search.controller";
import { SettingsController } from "./presentation/controllers/settings.controller";
import { TrackController } from "./presentation/controllers/track.controller";

function resolveDownloadsRoot(): string {
  try {
    return getEnv().DOWNLOADS;
  } catch {
    // Test suites can import the container before environment validation bootstraps.
    // TODO(secure-library-image-serving): Remove this fallback after `getEnv()` becomes lazily initialized.
    return process.env.DOWNLOADS ?? ".";
  }
}

function resolveSpotifyAuthConfig(): { clientId: string; redirectUri: string } {
  try {
    const env = getEnv();
    return { clientId: env.SPOTIFY_CLIENT_ID, redirectUri: env.SPOTIFY_REDIRECT_URI };
  } catch {
    return { clientId: "", redirectUri: "" };
  }
}

type ComposedSpotifyUserLibrary = SpotifyUserLibraryPort & {
  getMyPlaylists: SpotifyPlaylistLibraryService["getMyPlaylists"];
  getArtistCatalogData: SpotifyArtistCatalogService["getArtistCatalogData"];
};

// Repositories
const playlistRepository = new PrismaPlaylistRepository();
const trackRepository = new PrismaTrackRepository();
const historyRepository = new PrismaHistoryRepository();
const settingsRepository = new PrismaSettingsRepository();
const followedArtistRepository = new FollowedArtistRepository(prisma);
const artistAlbumCacheRepository = new ArtistAlbumCacheRepository(prisma);
const artistReleaseCacheRepository = new ArtistReleaseCacheRepository(prisma);
const feedSyncStateRepository = new FeedSyncStateRepository(prisma);
const artworkBackfillRepository = new PrismaArtworkBackfillRepository(prisma);
const feedCacheEvictionRepository = new FeedCacheEvictionRepository(prisma);
const feedCacheEvictionService = new FeedCacheEvictionService(feedCacheEvictionRepository);
const feedRepository: FeedRepositoryPort = {
  getArtistBySpotifyId: (spotifyId) => followedArtistRepository.getArtistBySpotifyId(spotifyId),
  getArtistCatalogIdentities: (spotifyIds) =>
    followedArtistRepository.getArtistCatalogIdentities(spotifyIds),
  updateArtistCatalogIdentities: (identities) =>
    followedArtistRepository.updateArtistCatalogIdentities(identities),
  getReleases: (lookbackDays) => artistReleaseCacheRepository.getReleases(lookbackDays),
  getArtists: () => followedArtistRepository.getArtists(),
  upsertArtists: (artists) => followedArtistRepository.upsertArtists(artists),
  upsertReleases: (releases) => artistReleaseCacheRepository.upsertReleases(releases),
  getArtistAlbumWithArtist: (spotifyArtistId, albumId) =>
    artistAlbumCacheRepository.getArtistAlbumWithArtist(spotifyArtistId, albumId),
  getArtistReleaseWithArtist: (artistId, albumId) =>
    artistReleaseCacheRepository.getArtistReleaseWithArtist(artistId, albumId),
  updateArtistAlbumIdentities: (id, identities) =>
    artistAlbumCacheRepository.updateArtistAlbumIdentities(id, identities),
  upsertArtistAlbumSpotifyUrl: (input) =>
    artistAlbumCacheRepository.upsertArtistAlbumSpotifyUrl(input),
  updateArtistReleaseSpotifyUrl: (artistId, albumId, spotifyUrl) =>
    artistReleaseCacheRepository.updateArtistReleaseSpotifyUrl(artistId, albumId, spotifyUrl),
  getArtistAlbumCount: (spotifyArtistId) =>
    artistAlbumCacheRepository.getArtistAlbumCount(spotifyArtistId),
  getArtistAlbumsFreshness: (spotifyArtistId) =>
    artistAlbumCacheRepository.getArtistAlbumsFreshness(spotifyArtistId),
  getArtistIdsWithNoAlbums: () => followedArtistRepository.getArtistIdsWithNoAlbums(),
  getArtistIdsWithFreshAlbums: (cutoffDate) =>
    artistAlbumCacheRepository.getArtistIdsWithFreshAlbums(cutoffDate),
  getArtistIdsWithFreshReleases: (cutoffDate) =>
    artistReleaseCacheRepository.getArtistIdsWithFreshReleases(cutoffDate),
  getArtistAlbums: (spotifyArtistId, limit, offset) =>
    artistAlbumCacheRepository.getArtistAlbums(spotifyArtistId, limit, offset),
  upsertArtistAlbums: (albums) => artistAlbumCacheRepository.upsertArtistAlbums(albums),
  evictStaleFeedCache: (artistIds, cutoffDays) =>
    feedCacheEvictionService.evictStaleFeedCache(artistIds, cutoffDays),
  getArtistIdsNeedingCatalogSync: (cutoffDate, limit) =>
    followedArtistRepository.getArtistIdsNeedingCatalogSync(cutoffDate, limit),
  getActiveArtistIdsForReleasesSync: (releaseCutoff, activityWindowDate, limit) =>
    followedArtistRepository.getActiveArtistIdsForReleasesSync(
      releaseCutoff,
      activityWindowDate,
      limit,
    ),
  updateArtistCatalogSyncedAt: (artistIds) =>
    followedArtistRepository.updateArtistCatalogSyncedAt(artistIds),
  updateArtistReleasesSyncedAt: (artistIds) =>
    followedArtistRepository.updateArtistReleasesSyncedAt(artistIds),
  getSyncState: () => feedSyncStateRepository.getSyncState(),
  setSyncState: (status, error) => feedSyncStateRepository.setSyncState(status, error),
  getCatalogSyncState: () => feedSyncStateRepository.getCatalogSyncState(),
  setCatalogSyncState: (status, error) =>
    feedSyncStateRepository.setCatalogSyncState(status, error),
};
const connectivityAdapter = new PrismaConnectivityAdapter();

const internalizedNumericSettingMap: Record<string, () => number> = {
  FEED_SYNC_INTERVAL_MINUTES: () => getEnv().FEED_SYNC_INTERVAL_MINUTES,
  RELEASES_SYNC_INTERVAL_MINUTES: () => getEnv().RELEASES_SYNC_INTERVAL_MINUTES,
  CATALOG_SYNC_INTERVAL_HOURS: () => getEnv().CATALOG_SYNC_INTERVAL_HOURS,
  CATALOG_LOOKBACK_DAYS: () => getEnv().CATALOG_LOOKBACK_DAYS,
  MAX_ACTIVE_ARTISTS_PER_CYCLE: () => getEnv().MAX_ACTIVE_ARTISTS_PER_CYCLE,
  MAX_CATALOG_ARTISTS_PER_CYCLE: () => getEnv().MAX_CATALOG_ARTISTS_PER_CYCLE,
  FOLLOWED_ARTISTS_MAX: () => getEnv().FOLLOWED_ARTISTS_MAX,
  RELEASES_LOOKBACK_DAYS: () => getEnv().RELEASES_LOOKBACK_DAYS,
  RELEASES_CACHE_MINUTES: () => getEnv().RELEASES_CACHE_MINUTES,
  YT_SEARCH_CONCURRENCY: () => getEnv().YT_SEARCH_CONCURRENCY,
  YT_SEARCH_DELAY_MS: () => getEnv().YT_SEARCH_DELAY_MS,
  YT_DOWNLOADS_PER_MINUTE: () => getEnv().YT_DOWNLOADS_PER_MINUTE,
  STUCK_TRACKS_CLEANUP_INTERVAL_MINUTES: () => getEnv().STUCK_TRACKS_CLEANUP_INTERVAL_MINUTES,
  STUCK_TRACKS_TIMEOUT_MINUTES: () => getEnv().STUCK_TRACKS_TIMEOUT_MINUTES,
};

// Services (Base)
const settingsService = new SettingsService(settingsRepository, (key) =>
  internalizedNumericSettingMap[key]?.(),
);

const trackFileHelper = new FileSystemTrackPathService(settingsService);
const m3uService = new FileSystemM3uService(settingsService, trackFileHelper);
const youtubeSearchService = new YoutubeSearchService(settingsService);
const youtubeDownloadService = new YoutubeDownloadService(settingsService, youtubeSearchService);
const metadataService = new MetadataService();
const artworkAssetsService = new ArtworkAssetsService();

const queueService = new BullMqTrackQueueService();
const artworkBackfillQueueService = new BullMqArtworkBackfillQueueService();
const eventBus = new AppEventBus();

let spotifyUserLibraryService: ComposedSpotifyUserLibrary | null = null;
let spotifyUserLibrarySyncService: ComposedSpotifyUserLibrary | null = null;
let spotifyPlaylistLibraryService: SpotifyPlaylistLibraryService | null = null;
let spotifyPlaylistLibrarySyncService: SpotifyPlaylistLibraryService | null = null;
let spotifyArtistCatalogService: SpotifyArtistCatalogService | null = null;
let spotifyArtistCatalogSyncService: SpotifyArtistCatalogService | null = null;
let spotifyFollowedArtistsService: SpotifyFollowedArtistsService | null = null;
let spotifyFollowedArtistsSyncService: SpotifyFollowedArtistsService | null = null;

// Spotify
const spotifyAuthService = SpotifyAuthService.getInstance(settingsService, () => {
  spotifyUserLibraryService?.clearCache();
  spotifyUserLibrarySyncService?.clearCache();
});
const spotifyRequestCache = new PromiseCache({ ttlMs: 30_000 });
const spotifyArtistClient = new SpotifyArtistClient(
  spotifyAuthService,
  settingsService,
  spotifyRequestCache,
  "interactive",
);
const spotifyTrackClient = new SpotifyTrackClient(
  spotifyAuthService,
  settingsService,
  "interactive",
  spotifyRequestCache,
);
const spotifyAlbumClient = new SpotifyAlbumClient(
  spotifyAuthService,
  settingsService,
  spotifyRequestCache,
  "interactive",
);
const spotifyPlaylistClient = new SpotifyPlaylistClient(
  spotifyAuthService,
  settingsService,
  spotifyTrackClient,
  spotifyAlbumClient,
  spotifyRequestCache,
  "interactive",
);

// Playlist client for background workers (downloads, sync) — uses sync limiter
// to avoid competing with user-facing interactive requests
const spotifyPlaylistClientSync = new SpotifyPlaylistClient(
  spotifyAuthService,
  settingsService,
  spotifyTrackClient,
  spotifyAlbumClient,
  spotifyRequestCache,
  "sync",
);
const spotifySearchClient = new SpotifySearchClient(
  spotifyAuthService,
  settingsService,
  spotifyRequestCache,
  "interactive",
);

spotifyFollowedArtistsService = new SpotifyFollowedArtistsService(
  settingsService,
  spotifyAuthService,
  "user",
);
spotifyPlaylistLibraryService = new SpotifyPlaylistLibraryService(
  settingsService,
  spotifyAuthService,
  "user",
);
spotifyArtistCatalogService = new SpotifyArtistCatalogService(
  settingsService,
  spotifyAuthService,
  "user",
);

spotifyFollowedArtistsSyncService = new SpotifyFollowedArtistsService(
  settingsService,
  spotifyAuthService,
  "sync",
);
spotifyPlaylistLibrarySyncService = new SpotifyPlaylistLibraryService(
  settingsService,
  spotifyAuthService,
  "sync",
);
spotifyArtistCatalogSyncService = new SpotifyArtistCatalogService(
  settingsService,
  spotifyAuthService,
  "sync",
);

spotifyUserLibraryService = {
  getFollowedArtists: () => spotifyFollowedArtistsService.getFollowedArtists(),
  getMyPlaylists: () => spotifyPlaylistLibraryService.getMyPlaylists(),
  getArtistCatalogData: (artists, earlyStopBeforeDate) =>
    spotifyArtistCatalogService.getArtistCatalogData(artists, earlyStopBeforeDate),
  clearCache: () => {
    spotifyFollowedArtistsService?.clearCache();
    spotifyPlaylistLibraryService?.clearCache();
    spotifyArtistCatalogService?.clearCache();
  },
};

spotifyUserLibrarySyncService = {
  getFollowedArtists: () => spotifyFollowedArtistsSyncService.getFollowedArtists(),
  getMyPlaylists: () => spotifyPlaylistLibrarySyncService.getMyPlaylists(),
  getArtistCatalogData: (artists, earlyStopBeforeDate) =>
    spotifyArtistCatalogSyncService.getArtistCatalogData(artists, earlyStopBeforeDate),
  clearCache: () => {
    spotifyFollowedArtistsSyncService?.clearCache();
    spotifyPlaylistLibrarySyncService?.clearCache();
    spotifyArtistCatalogSyncService?.clearCache();
  },
};

// External catalog providers (Deezer primary, MusicBrainz fallback; Spotify URLs materialize on demand)
const deezerClient = new DeezerClient();
const musicBrainzClient = new MusicBrainzClient();
const releaseFeedService = new ReleaseFeedService(feedRepository, deezerClient, musicBrainzClient);

// Interactive SpotifyService — for user-facing controllers (preview, search, artist detail)
const spotifyService = new SpotifyService({
  artistClient: spotifyArtistClient,
  trackClient: spotifyTrackClient,
  albumClient: spotifyAlbumClient,
  playlistClient: spotifyPlaylistClient,
  searchClient: spotifySearchClient,
  userLibraryService: spotifyUserLibraryService,
});

// Sync SpotifyService — for background workers (create playlist, sync, post-processing)
// Uses sync rate limiter for playlist fetches to avoid starving interactive requests
const spotifyServiceSync = new SpotifyService({
  artistClient: spotifyArtistClient,
  trackClient: spotifyTrackClient,
  albumClient: spotifyAlbumClient,
  playlistClient: spotifyPlaylistClientSync,
  searchClient: spotifySearchClient,
  userLibraryService: spotifyUserLibrarySyncService,
});

// Services (Post-Processing) — uses sync service to avoid starving interactive requests
const artworkService = new ArtworkService(
  playlistRepository,
  spotifyServiceSync,
  trackFileHelper,
  artworkAssetsService,
);
const trackPostProcessingService = new TrackPostProcessingService(
  artworkService,
  metadataService,
  playlistRepository,
  trackRepository,
  trackFileHelper,
  m3uService,
);

// Use Cases - Tracks
const createTrackUseCase = new CreateTrackUseCase(trackRepository, queueService);
const deleteTrackUseCase = new DeleteTrackUseCase(trackRepository);
const getTracksUseCase = new GetTracksUseCase(trackRepository, playlistRepository, trackFileHelper);
const updateTrackUseCase = new UpdateTrackUseCase(trackRepository);
const searchTrackOnYoutubeUseCase = new SearchTrackOnYoutubeUseCase(
  trackRepository,
  youtubeSearchService,
  settingsService,
  queueService,
  eventBus,
);
const retryTrackDownloadUseCase = new RetryTrackDownloadUseCase(trackRepository, queueService);
const rescueStuckTracksUseCase = new RescueStuckTracksUseCase(
  trackRepository,
  retryTrackDownloadUseCase,
);
const downloadTrackUseCase = new DownloadTrackUseCase(
  trackRepository,
  youtubeDownloadService,
  trackFileHelper,
  playlistRepository,
  historyRepository,
  eventBus,
  trackPostProcessingService,
);

// Domain Services (Track)
const trackService = new TrackService({
  searchTrackOnYoutubeUseCase,
  downloadTrackUseCase,
  createTrackUseCase,
  deleteTrackUseCase,
  getTracksUseCase,
  retryTrackDownloadUseCase,
  updateTrackUseCase,
});

const trackController = new TrackController(
  deleteTrackUseCase,
  getTracksUseCase,
  retryTrackDownloadUseCase,
);

// Use Cases - Settings
const getSettingsUseCase = new GetSettingsUseCase(settingsRepository);
const updateSettingUseCase = new UpdateSettingUseCase(
  settingsRepository,
  spotifyUserLibraryService,
  eventBus,
);

// Use Cases - Playlists
const getSystemStatusUseCase = new GetSystemStatusUseCase(playlistRepository);
const getPlaylistPreviewUseCase = new GetPlaylistPreviewUseCase(spotifyService);
const getPlaylistPreviewTracksPageUseCase = new GetPlaylistPreviewTracksPageUseCase(spotifyService);
const getPlaylistsUseCase = new GetPlaylistsUseCase(playlistRepository);
const deletePlaylistUseCase = new DeletePlaylistUseCase(playlistRepository, eventBus);
const updatePlaylistUseCase = new UpdatePlaylistUseCase(playlistRepository, eventBus);

const spotifyCircuitBreakerAdapter = new SpotifyCircuitBreakerAdapter();

const syncSubscribedPlaylistsUseCase = new SyncSubscribedPlaylistsUseCase(
  playlistRepository,
  spotifyServiceSync,
  trackService,
  eventBus,
  spotifyCircuitBreakerAdapter,
);

const retryPlaylistDownloadsUseCase = new RetryPlaylistDownloadsUseCase(
  playlistRepository,
  trackService,
);

const getMyPlaylistsUseCase = new GetMyPlaylistsUseCase(spotifyService);

// Library Services
const fileSystemScannerService = new FileSystemScannerService();
const cacheArtworkSourceService = new CacheArtworkSourceService(prisma, trackFileHelper);
const fileSystemArtworkSourceService = new FileSystemArtworkSourceService(
  trackFileHelper,
  artworkAssetsService,
);
const embeddedArtworkSourceService = new EmbeddedArtworkSourceService();
const spotifyArtworkSourceService = new SpotifyArtworkSourceService(
  spotifyArtistClient,
  spotifyAlbumClient,
  spotifySearchClient,
);
const processArtworkBackfillBatchUseCase = new ProcessArtworkBackfillBatchUseCase(
  cacheArtworkSourceService,
  fileSystemArtworkSourceService,
  cacheArtworkSourceService,
  embeddedArtworkSourceService,
  spotifyArtworkSourceService,
  artworkBackfillRepository,
);
const startArtworkBackfillUseCase = new StartArtworkBackfillUseCase(
  artworkBackfillRepository,
  artworkBackfillQueueService,
);
const pauseArtworkBackfillUseCase = new PauseArtworkBackfillUseCase(artworkBackfillRepository);
const resumeArtworkBackfillUseCase = new ResumeArtworkBackfillUseCase(
  artworkBackfillRepository,
  artworkBackfillQueueService,
);
const getArtworkBackfillStatusUseCase = new GetArtworkBackfillStatusUseCase(
  artworkBackfillRepository,
);
const scanLibraryUseCase = new ScanLibraryUseCase(
  fileSystemScannerService,
  trackFileHelper,
  trackRepository,
);
const libraryService = new LibraryService(scanLibraryUseCase);
const libraryAudioService = new FileSystemLibraryAudioService(() => resolveDownloadsRoot());
const libraryImageService = new FileSystemLibraryImageService(() => resolveDownloadsRoot());

const libraryController = new LibraryController(
  libraryService,
  libraryAudioService,
  libraryImageService,
);
const artworkBackfillController = new ArtworkBackfillController(
  startArtworkBackfillUseCase,
  pauseArtworkBackfillUseCase,
  resumeArtworkBackfillUseCase,
  getArtworkBackfillStatusUseCase,
);
const healthService = new HealthService(connectivityAdapter);

const getArtistDetailUseCase = new GetArtistDetailUseCase(
  feedRepository,
  releaseFeedService,
  spotifyArtistClient,
);
const getArtistAlbumsUseCase = new GetArtistAlbumsUseCase(feedRepository, releaseFeedService);
const noopAlbumTracksCache = new NoopAlbumTracksCache();
const getAlbumTracksUseCase = new GetAlbumTracksUseCase(
  feedRepository,
  deezerClient,
  musicBrainzClient,
  spotifyAlbumClient,
  noopAlbumTracksCache,
);
// Background use cases — use sync service to avoid starving interactive requests
// getAlbumTracksUseCase must be declared before this
const createPlaylistUseCase = new CreatePlaylistUseCase(
  playlistRepository,
  spotifyServiceSync,
  trackService,
  settingsService,
  eventBus,
  getAlbumTracksUseCase,
  feedRepository,
);

// Domain Services (Playlist)
const playlistService = new PlaylistService({
  createPlaylistUseCase,
  getSystemStatusUseCase,
  getPlaylistPreviewUseCase,
  syncSubscribedPlaylistsUseCase,
  getPlaylistsUseCase,
  deletePlaylistUseCase,
  updatePlaylistUseCase,
  retryPlaylistDownloadsUseCase,
  getMyPlaylistsUseCase,
});

const playlistController = new PlaylistController(
  createPlaylistUseCase,
  deletePlaylistUseCase,
  getMyPlaylistsUseCase,
  getPlaylistPreviewUseCase,
  getPlaylistPreviewTracksPageUseCase,
  getPlaylistsUseCase,
  getSystemStatusUseCase,
  retryPlaylistDownloadsUseCase,
  updatePlaylistUseCase,
);

const artistController = new ArtistController(
  getArtistDetailUseCase,
  getArtistAlbumsUseCase,
  getAlbumTracksUseCase,
);
const searchController = new SearchController(spotifyService);

const settingsController = new SettingsController(getSettingsUseCase, updateSettingUseCase);

const historyUseCases = new HistoryUseCases({ repository: historyRepository });
const historyController = new HistoryController(historyUseCases);

const getRecentReleasesUseCase = new GetRecentReleasesUseCase(
  feedRepository,
  spotifyUserLibraryService,
  releaseFeedService,
  settingsService,
);
const feedController = new FeedController(
  spotifyUserLibraryService,
  feedRepository,
  getRecentReleasesUseCase,
);
const authController = new AuthController(
  spotifyAuthService,
  settingsService,
  resolveSpotifyAuthConfig().clientId,
  resolveSpotifyAuthConfig().redirectUri,
);
const healthController = new HealthController(healthService);
const eventsController = new EventsController();

// When SPOTIFY_MARKET changes, invalidate the in-memory market cache on all clients
// so the next request picks up the new value from DB
eventBus.on("settings:updated", ({ key }: { key: string }) => {
  if (key === "SPOTIFY_MARKET") {
    spotifyArtistClient.clearMarketCache();
    spotifyAlbumClient.clearMarketCache();
    spotifyTrackClient.clearMarketCache();
    spotifyPlaylistClient.clearMarketCache();
    spotifySearchClient.clearMarketCache();
    spotifyPlaylistClientSync.clearMarketCache();
  }
});

// Export container
export const container = {
  playlistService,
  playlistController,
  trackService,
  trackController,
  artistController,
  searchController,
  libraryController,
  artworkBackfillController,
  settingsController,
  historyController,
  feedController,
  authController,
  healthController,
  eventsController,
  spotifyService,
  spotifyArtistClient,
  spotifyTrackClient,
  spotifyAlbumClient,
  spotifyPlaylistClient,
  spotifySearchClient,
  spotifyUserLibraryService,
  spotifyUserLibrarySyncService,
  spotifyAuthService,
  deezerClient,
  musicBrainzClient,
  releaseFeedService,

  settingsService,
  getSettingsUseCase,
  updateSettingUseCase,
  queueService,
  eventBus,
  trackPostProcessingService,
  rescueStuckTracksUseCase,
  libraryService,
  feedRepository,
  artworkBackfillRepository,
  processArtworkBackfillBatchUseCase,
};
