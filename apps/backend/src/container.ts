import { LibraryService } from "./application/services/library.service";
import { PlaylistService } from "./application/services/playlist.service";
import { SettingsService } from "./application/services/settings.service";
import { TrackPostProcessingService } from "./application/services/track-post-processing.service";
import { TrackService } from "./application/services/track.service";
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
import { SpotifyService } from "./domain/services/spotify.service";
import { FeedRepository } from "./infrastructure/database/feed.repository";
import { PrismaHistoryRepository } from "./infrastructure/database/prisma-history.repository";
import { PrismaPlaylistRepository } from "./infrastructure/database/prisma-playlist.repository";
import { PrismaSettingsRepository } from "./infrastructure/database/prisma-settings.repository";
import { PrismaTrackRepository } from "./infrastructure/database/prisma-track.repository";
import { SpotifyAlbumClient } from "./infrastructure/external/spotify-album.client";
import { SpotifyArtistClient } from "./infrastructure/external/spotify-artist.client";
import { SpotifyAuthService } from "./infrastructure/external/spotify-auth.service";
import { SpotifyPlaylistClient } from "./infrastructure/external/spotify-playlist.client";
import { SpotifySearchClient } from "./infrastructure/external/spotify-search.client";
import { SpotifyTrackClient } from "./infrastructure/external/spotify-track.client";
import { SpotifyUserLibraryService } from "./infrastructure/external/spotify-user-library.service";
import { YoutubeDownloadService } from "./infrastructure/external/youtube-download.service";
import { YoutubeSearchService } from "./infrastructure/external/youtube-search.service";
import { AppEventBus } from "./infrastructure/messaging/app-event-bus";
import { BullMqTrackQueueService } from "./infrastructure/messaging/bullmq-track-queue.service";
import { FileSystemM3uService } from "./infrastructure/services/file-system-m3u.service";
import { FileSystemScannerService } from "./infrastructure/services/file-system-scanner.service";
import { FileSystemTrackPathService } from "./infrastructure/services/file-system-track-path.service";
import { MetadataService } from "./infrastructure/services/metadata.service";
import { prisma } from "./infrastructure/setup/prisma";
import { ArtistController } from "./presentation/controllers/artist.controller";
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

// Repositories
const playlistRepository = new PrismaPlaylistRepository();
const trackRepository = new PrismaTrackRepository();
const historyRepository = new PrismaHistoryRepository();
const settingsRepository = new PrismaSettingsRepository();
const feedRepository = new FeedRepository(prisma);

// Services (Base)
const settingsService = new SettingsService(settingsRepository);

const trackFileHelper = new FileSystemTrackPathService(settingsService);
const m3uService = new FileSystemM3uService(settingsService, trackFileHelper);
const youtubeSearchService = new YoutubeSearchService(settingsService);
const youtubeDownloadService = new YoutubeDownloadService(settingsService, youtubeSearchService);
const metadataService = new MetadataService();

const queueService = new BullMqTrackQueueService();
const eventBus = new AppEventBus();

// Spotify
const spotifyAuthService = SpotifyAuthService.getInstance(settingsService);
const spotifyArtistClient = new SpotifyArtistClient(
  spotifyAuthService,
  settingsService,
  "interactive",
);
const spotifyTrackClient = new SpotifyTrackClient(
  spotifyAuthService,
  settingsService,
  "interactive",
);
const spotifyAlbumClient = new SpotifyAlbumClient(
  spotifyAuthService,
  settingsService,
  "interactive",
);
const spotifyPlaylistClient = new SpotifyPlaylistClient(
  spotifyAuthService,
  settingsService,
  spotifyTrackClient,
  spotifyAlbumClient,
  "interactive",
);
const spotifySearchClient = new SpotifySearchClient(
  spotifyAuthService,
  settingsService,
  "interactive",
);

const spotifyUserLibraryService = SpotifyUserLibraryService.getInstance(
  settingsService,
  spotifyAuthService,
);
const spotifyUserLibrarySyncService = SpotifyUserLibraryService.getInstance(
  settingsService,
  spotifyAuthService,
  "sync",
);
const spotifyService = new SpotifyService(
  spotifyArtistClient,
  spotifyTrackClient,
  spotifyAlbumClient,
  spotifyPlaylistClient,
  spotifySearchClient,
  spotifyUserLibraryService,
);

// Services (Post-Processing)
const trackPostProcessingService = new TrackPostProcessingService(
  spotifyService,
  metadataService,
  playlistRepository,
  trackRepository,
  trackFileHelper,
  m3uService,
);

// Use Cases - Tracks
const createTrackUseCase = new CreateTrackUseCase(trackRepository, queueService);
const deleteTrackUseCase = new DeleteTrackUseCase(trackRepository);
const getTracksUseCase = new GetTracksUseCase(trackRepository);
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

const createPlaylistUseCase = new CreatePlaylistUseCase(
  playlistRepository,
  spotifyService,
  trackService,
  settingsService,
  eventBus,
);

const syncSubscribedPlaylistsUseCase = new SyncSubscribedPlaylistsUseCase(
  playlistRepository,
  spotifyService,
  trackService,
  eventBus,
);

const retryPlaylistDownloadsUseCase = new RetryPlaylistDownloadsUseCase(
  playlistRepository,
  trackService,
);

const getMyPlaylistsUseCase = new GetMyPlaylistsUseCase(spotifyService);

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

// Library Services
const fileSystemScannerService = new FileSystemScannerService();
const scanLibraryUseCase = new ScanLibraryUseCase(
  fileSystemScannerService,
  trackFileHelper,
  trackRepository,
);
const libraryService = new LibraryService(scanLibraryUseCase);

const libraryController = new LibraryController(libraryService);
const artistController = new ArtistController(
  spotifyArtistClient,
  feedRepository,
  spotifyAlbumClient,
);
const searchController = new SearchController(spotifyService);

const settingsController = new SettingsController(getSettingsUseCase, updateSettingUseCase);

const historyUseCases = new HistoryUseCases({ repository: historyRepository });
const historyController = new HistoryController(historyUseCases);

const feedController = new FeedController(
  spotifyUserLibraryService,
  feedRepository,
  settingsService,
);
const authController = new AuthController(spotifyAuthService, settingsService);
const healthController = new HealthController();
const eventsController = new EventsController();

// Export container
export const container = {
  playlistService,
  playlistController,
  trackService,
  trackController,
  artistController,
  searchController,
  libraryController,
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

  settingsService,
  getSettingsUseCase,
  updateSettingUseCase,
  queueService,
  eventBus,
  trackPostProcessingService,
  rescueStuckTracksUseCase,
  libraryService,
  feedRepository,
};
