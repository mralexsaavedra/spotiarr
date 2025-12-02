import { PlaylistTypeEnum, TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import * as fs from "fs";
import * as path from "path";
import { UtilsService } from "../../application/services/utils.service";
import { SpotifyService } from "../../infrastructure/external/spotify.service";
import { YoutubeService } from "../../infrastructure/external/youtube.service";
import { M3uService } from "../../infrastructure/file-system/m3u.service";
import { TrackFileHelper } from "../../infrastructure/file-system/track-file.helper";
import { EventBus } from "../events/event-bus";
import { HistoryRepository } from "../interfaces/history.repository";
import { PlaylistRepository } from "../interfaces/playlist.repository";
import { TrackRepository } from "../interfaces/track.repository";

export class DownloadTrackUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly youtubeService: YoutubeService,
    private readonly m3uService: M3uService,
    private readonly utilsService: UtilsService,
    private readonly trackFileHelper: TrackFileHelper,
    private readonly playlistRepository: PlaylistRepository,
    private readonly spotifyService: SpotifyService,
    private readonly downloadHistoryRepository: HistoryRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(track: ITrack): Promise<void> {
    // Validate track exists
    if (!track.id || !(await this.trackRepository.findOne(track.id))) {
      return;
    }

    // Validate required fields
    this.validateTrack(track);

    // Update status to Downloading
    await this.trackRepository.update(track.id, {
      ...track,
      status: TrackStatusEnum.Downloading,
    });
    this.eventBus.emit("playlists-updated");

    let error: string | undefined;

    try {
      await this.downloadAndProcessTrack(track);
    } catch (err) {
      console.error(
        `Failed to download track: ${track.artist} - ${track.name}`,
        err instanceof Error ? err.stack : String(err),
      );
      error = err instanceof Error ? err.message : String(err);
    }

    // Update final status
    const updatedTrack = {
      ...track,
      status: error ? TrackStatusEnum.Error : TrackStatusEnum.Completed,
      ...(error ? { error } : {}),
      ...(!error ? { completedAt: Date.now() } : {}),
    };

    await this.trackRepository.update(track.id, updatedTrack);

    // Persist in download history when successful
    if (!error) {
      // We need playlist info; reload with relations so playlist is present
      const persistedTrack = await this.trackRepository.findOneWithPlaylist(track.id);
      if (persistedTrack && persistedTrack.completedAt) {
        await this.downloadHistoryRepository.createFromTrack(persistedTrack);
        this.eventBus.emit("download-history-updated");
      }
    }

    // Generate M3U if successful
    if (!error && track.playlistId) {
      await this.generateM3uIfNeeded(track);
    }

    // Notify playlists have changed (track status affects playlist state)
    this.eventBus.emit("playlists-updated");
  }

  private validateTrack(track: ITrack): void {
    if (!track.name || !track.artist) {
      const errorMsg = `Track field is null or undefined: name=${track.name}, artist=${track.artist}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  private async downloadAndProcessTrack(track: ITrack): Promise<void> {
    let playlistName: string | undefined;
    let playlistCoverUrl: string | undefined;
    let isPlaylistType = false;

    if (track.playlistId) {
      const playlist = await this.playlistRepository.findOne(track.playlistId);
      // Check if it's strictly a playlist (not artist or album download)
      isPlaylistType = playlist?.type === "playlist";
      if (playlist) {
        playlistCoverUrl = playlist.coverUrl;
        if (isPlaylistType) {
          playlistName = playlist.name;
        }
      }
    }

    const trackFilePath = await this.trackFileHelper.getFolderName(track, playlistName);
    const trackDirectory = path.dirname(trackFilePath);

    // Create directory structure
    if (!fs.existsSync(trackDirectory)) {
      fs.mkdirSync(trackDirectory, { recursive: true });
    }

    await this.youtubeService.downloadAndFormat(track, trackFilePath);

    // Fetch specific track cover image (Album Cover) from Spotify
    let trackCoverUrl = "";
    const urlToUse = track.spotifyUrl || track.trackUrl;

    if (urlToUse) {
      try {
        const details = await this.spotifyService.getPlaylistDetail(urlToUse);
        trackCoverUrl = details.image;
      } catch (e) {
        console.warn(`Failed to fetch cover for track ${track.name}`, e);
      }
    }

    // Embed ID3 cover (prefer specific track cover)
    await this.youtubeService.addImage(
      trackFilePath,
      trackCoverUrl || playlistCoverUrl || "",
      track.name,
      track.artist,
      track.albumYear,
    );

    // Save folder cover.jpg
    // If it's a playlist, use the playlist cover.
    // If it's an artist/album/track download, use the track (album) cover.
    const folderCoverUrl = isPlaylistType ? playlistCoverUrl : trackCoverUrl;
    if (folderCoverUrl) {
      await this.youtubeService.saveCoverArt(trackDirectory, folderCoverUrl);
    }

    // If it's not a Playlist (Artist, Album, or Track), save the artist image in the artist folder
    if (track.playlistId) {
      const playlist = await this.playlistRepository.findOne(track.playlistId);

      console.debug(
        `Checking artist cover for playlist ${track.playlistId}: type=${playlist?.type}, hasImage=${!!playlist?.artistImageUrl}`,
      );

      if (playlist && playlist.type !== PlaylistTypeEnum.Playlist && playlist.artistImageUrl) {
        const artistFolderPath = this.utilsService.getArtistFolderPath(track.artist);
        console.debug(`Saving artist cover to ${artistFolderPath}`);

        // Ensure artist folder exists
        if (!fs.existsSync(artistFolderPath)) {
          fs.mkdirSync(artistFolderPath, { recursive: true });
        }
        await this.youtubeService.saveCoverArt(
          artistFolderPath,
          playlist.artistImageUrl,
          "cover.jpg",
        );
      }
    }
  }

  private async generateM3uIfNeeded(track: ITrack): Promise<void> {
    if (!track.playlistId) return;

    try {
      const playlist = await this.playlistRepository.findOne(track.playlistId);
      // Only generate M3U for actual playlists
      if (!playlist || !playlist.name || playlist.type !== "playlist") return;

      const playlistTracks = await this.trackRepository.findAllByPlaylist(track.playlistId);
      const hasMultipleTracks = playlistTracks.length > 0;

      if (hasMultipleTracks) {
        const playlistFolderPath = this.utilsService.getPlaylistFolderPath(playlist.name);
        await this.m3uService.generateM3uFile(playlist, playlistTracks, playlistFolderPath);

        const completedCount = this.m3uService.getCompletedTracksCount(playlistTracks);
        const totalCount = playlistTracks.length;
        console.debug(`Playlist: ${completedCount}/${totalCount} tracks completed`);
      }
    } catch (err) {
      console.error("Failed to generate M3U file", err instanceof Error ? err.stack : String(err));
    }
  }
}
