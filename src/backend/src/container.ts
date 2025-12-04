import { PlaylistService } from "./application/services/playlist.service";
import { SettingsService } from "./application/services/settings.service";
import { TrackService } from "./application/services/track.service";
import { UtilsService } from "./application/services/utils.service";
import { PrismaHistoryRepository } from "./infrastructure/database/prisma-history.repository";
import { PrismaPlaylistRepository } from "./infrastructure/database/prisma-playlist.repository";
import { PrismaSettingsRepository } from "./infrastructure/database/prisma-settings.repository";
import { PrismaTrackRepository } from "./infrastructure/database/prisma-track.repository";
import { SpotifyApiService } from "./infrastructure/external/spotify-api.service";
import { SpotifyService } from "./infrastructure/external/spotify.service";
import { YoutubeService } from "./infrastructure/external/youtube.service";
import { BullMqTrackQueueService } from "./infrastructure/messaging/bullmq-track-queue.service";
import { SseEventBus } from "./infrastructure/messaging/sse-event-bus";
import { FileSystemM3uService } from "./infrastructure/services/file-system-m3u.service";
import { FileSystemTrackPathService } from "./infrastructure/services/file-system-track-path.service";

// Repositories
const playlistRepository = new PrismaPlaylistRepository();
const trackRepository = new PrismaTrackRepository();
const historyRepository = new PrismaHistoryRepository();
const settingsRepository = new PrismaSettingsRepository();

// Services (Base)
const settingsService = new SettingsService(settingsRepository);
const utilsService = new UtilsService();
const m3uService = new FileSystemM3uService(settingsService);
const youtubeService = new YoutubeService(settingsService);
const trackFileHelper = new FileSystemTrackPathService(settingsService, utilsService);
const queueService = new BullMqTrackQueueService();
const eventBus = new SseEventBus();

// Spotify
const spotifyApiService = SpotifyApiService.getInstance(settingsService);
const spotifyService = new SpotifyService(spotifyApiService);

// Domain Services (with DI)
const trackService = new TrackService({
  repository: trackRepository,
  queueService,
  trackFileHelper,
  youtubeService,
  m3uService,
  utilsService,
  settingsService,
  playlistRepository,
  spotifyService,
  historyRepository,
  eventBus,
});

const playlistService = new PlaylistService({
  repository: playlistRepository,
  trackService,
  spotifyService,
  settingsService,
  eventBus,
});

// Export container
export const container = {
  playlistService,
  trackService,
  spotifyService,
  spotifyApiService,
  settingsService,
  queueService,
  eventBus,
};
