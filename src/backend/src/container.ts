import { TrackFileHelper } from "./helpers/track-file.helper";
import { PrismaHistoryRepository } from "./repositories/prisma-history.repository";
import { PrismaPlaylistRepository } from "./repositories/prisma-playlist.repository";
import { PrismaTrackRepository } from "./repositories/prisma-track.repository";
import { BullMqTrackQueueService } from "./services/bullmq-track-queue.service";
import { M3uService } from "./services/m3u.service";
import { PlaylistService } from "./services/playlist.service";
import { SettingsService } from "./services/settings.service";
import { SpotifyApiService } from "./services/spotify-api.service";
import { SpotifyService } from "./services/spotify.service";
import { TrackService } from "./services/track.service";
import { UtilsService } from "./services/utils.service";
import { YoutubeService } from "./services/youtube.service";

// Repositories
const playlistRepository = new PrismaPlaylistRepository();
const trackRepository = new PrismaTrackRepository();
const historyRepository = new PrismaHistoryRepository();

// Services (Base)
const settingsService = new SettingsService();
const utilsService = new UtilsService();
const m3uService = new M3uService();
const youtubeService = new YoutubeService();
const trackFileHelper = new TrackFileHelper();
const queueService = new BullMqTrackQueueService();

// Spotify
const spotifyApiService = SpotifyApiService.getInstance();
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
});

const playlistService = new PlaylistService({
  repository: playlistRepository,
  trackService,
  spotifyService,
  settingsService,
});

// Export container
export const container = {
  playlistService,
  trackService,
  spotifyService,
  settingsService,
  queueService,
};
