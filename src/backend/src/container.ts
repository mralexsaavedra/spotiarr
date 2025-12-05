import { PlaylistService } from "./application/services/playlist.service";
import { SettingsService } from "./application/services/settings.service";
import { TrackService } from "./application/services/track.service";
import { UtilsService } from "./application/services/utils.service";
import { CreatePlaylistUseCase } from "./application/use-cases/playlists/create-playlist.use-case";
import { DeletePlaylistUseCase } from "./application/use-cases/playlists/delete-playlist.use-case";
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
import { RetryTrackDownloadUseCase } from "./application/use-cases/tracks/retry-track-download.use-case";
import { SearchTrackOnYoutubeUseCase } from "./application/use-cases/tracks/search-track-on-youtube.use-case";
import { UpdateTrackUseCase } from "./application/use-cases/tracks/update-track.use-case";
import { PrismaHistoryRepository } from "./infrastructure/database/prisma-history.repository";
import { PrismaPlaylistRepository } from "./infrastructure/database/prisma-playlist.repository";
import { PrismaSettingsRepository } from "./infrastructure/database/prisma-settings.repository";
import { PrismaTrackRepository } from "./infrastructure/database/prisma-track.repository";
import { SpotifyApiService } from "./infrastructure/external/spotify-api.service";
import { SpotifyService } from "./infrastructure/external/spotify.service";
import { YoutubeDownloadService } from "./infrastructure/external/youtube-download.service";
import { YoutubeSearchService } from "./infrastructure/external/youtube-search.service";
import { BullMqTrackQueueService } from "./infrastructure/messaging/bullmq-track-queue.service";
import { SseEventBus } from "./infrastructure/messaging/sse-event-bus";
import { FileSystemM3uService } from "./infrastructure/services/file-system-m3u.service";
import { FileSystemTrackPathService } from "./infrastructure/services/file-system-track-path.service";
import { MetadataService } from "./infrastructure/services/metadata.service";

// Repositories
const playlistRepository = new PrismaPlaylistRepository();
const trackRepository = new PrismaTrackRepository();
const historyRepository = new PrismaHistoryRepository();
const settingsRepository = new PrismaSettingsRepository();

// Services (Base)
const settingsService = new SettingsService(settingsRepository);
const utilsService = new UtilsService();
const m3uService = new FileSystemM3uService(settingsService);
const youtubeSearchService = new YoutubeSearchService();
const youtubeDownloadService = new YoutubeDownloadService(settingsService, youtubeSearchService);
const metadataService = new MetadataService();
const trackFileHelper = new FileSystemTrackPathService(settingsService, utilsService);
const queueService = new BullMqTrackQueueService();
const eventBus = new SseEventBus();

// Spotify
const spotifyApiService = SpotifyApiService.getInstance(settingsService);
const spotifyService = new SpotifyService(spotifyApiService);

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
const downloadTrackUseCase = new DownloadTrackUseCase(
  trackRepository,
  youtubeDownloadService,
  metadataService,
  m3uService,
  utilsService,
  trackFileHelper,
  playlistRepository,
  spotifyService,
  historyRepository,
  eventBus,
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

// Use Cases - Settings
const getSettingsUseCase = new GetSettingsUseCase(settingsRepository);
const updateSettingUseCase = new UpdateSettingUseCase(settingsRepository, spotifyApiService);

// Use Cases - Playlists
const getSystemStatusUseCase = new GetSystemStatusUseCase(playlistRepository);
const getPlaylistPreviewUseCase = new GetPlaylistPreviewUseCase(spotifyService);
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
});

// Export container
export const container = {
  playlistService,
  trackService,
  spotifyService,
  spotifyApiService,
  settingsService,
  getSettingsUseCase,
  updateSettingUseCase,
  queueService,
  eventBus,
};
