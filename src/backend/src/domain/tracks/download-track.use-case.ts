import { TrackStatusEnum } from "@spotiarr/shared";
import { TrackEntity } from "entities/track.entity";
import * as fs from "fs";
import { SpotifyUrlHelper } from "helpers/spotify-url.helper";
import { TrackFileHelper } from "helpers/track-file.helper";
import * as path from "path";
import { DownloadHistoryRepository } from "repositories/download-history.repository";
import { emitSseEvent } from "routes/events.routes";
import { M3uService } from "services/m3u.service";
import { UtilsService } from "services/utils.service";
import { YoutubeService } from "services/youtube.service";
import { TrackRepository } from "./track.repository";

export class DownloadTrackUseCase {
  constructor(
    private readonly trackRepository: TrackRepository,
    private readonly youtubeService: YoutubeService,
    private readonly m3uService: M3uService,
    private readonly utilsService: UtilsService,
    private readonly trackFileHelper: TrackFileHelper,
    private readonly downloadHistoryRepository: DownloadHistoryRepository = new DownloadHistoryRepository(),
  ) {}

  async execute(track: TrackEntity): Promise<void> {
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
    emitSseEvent("playlists-updated");

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
        emitSseEvent("download-history-updated");
      }
    }

    // Generate M3U if successful
    if (!error && track.playlist) {
      await this.generateM3uIfNeeded(track);
    }

    // Notify playlists have changed (track status affects playlist state)
    emitSseEvent("playlists-updated");
  }

  private validateTrack(track: TrackEntity): void {
    if (!track.name || !track.artist || !track.playlist || !track.playlist.coverUrl) {
      const errorMsg = `Track or playlist field is null or undefined: name=${track.name}, artist=${track.artist}, playlist=${track.playlist ? "ok" : "null"}, coverUrl=${track.playlist?.coverUrl}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  private async downloadAndProcessTrack(track: TrackEntity): Promise<void> {
    if (!track.playlist) {
      throw new Error("Track has no playlist");
    }

    const trackFilePath = await this.trackFileHelper.getFolderName(track);
    const trackDirectory = path.dirname(trackFilePath);

    // Create directory structure
    if (!fs.existsSync(trackDirectory)) {
      fs.mkdirSync(trackDirectory, { recursive: true });
    }

    // Download and format audio
    await this.youtubeService.downloadAndFormat(track, trackFilePath);

    // Embed cover art: prefer album cover, then primary artist image, then playlist cover
    const embeddedCoverUrl =
      track.albumCoverUrl || track.primaryArtistImageUrl || track.playlist.coverUrl || "";

    await this.youtubeService.addImage(
      trackFilePath,
      embeddedCoverUrl,
      track.name,
      track.artist,
      track.albumYear,
    );

    // Save cover images
    await this.saveCoverImages(track, trackDirectory);
  }

  private async saveCoverImages(track: TrackEntity, trackDirectory: string): Promise<void> {
    if (!track.playlist) return;

    const isPlaylist = SpotifyUrlHelper.isPlaylist(track.playlist.spotifyUrl);

    if (isPlaylist) {
      // For playlists: save playlist cover in the playlist folder
      await this.youtubeService.saveCoverArt(trackDirectory, track.playlist.coverUrl || "");
    } else {
      // For albums/tracks: save covers at album level and artist level
      const albumDirectory = trackDirectory;
      const artistDirectory = path.dirname(albumDirectory);

      // Save album cover: prefer per-track album cover, then primary artist image
      const albumCoverUrl =
        track.albumCoverUrl || track.primaryArtistImageUrl || track.playlist.coverUrl || "";
      await this.youtubeService.saveCoverArt(albumDirectory, albumCoverUrl);

      // Save artist cover: prefer the primary artist image for this track, then playlist artist image
      const artistCoverUrl = track.primaryArtistImageUrl || track.playlist.artistImageUrl || "";
      if (artistCoverUrl) {
        await this.youtubeService.saveCoverArt(artistDirectory, artistCoverUrl);
      }
    }
  }

  private async generateM3uIfNeeded(track: TrackEntity): Promise<void> {
    if (!track.playlist || !track.playlist.id) return;

    try {
      const playlistTracks = await this.trackRepository.findAllByPlaylist(track.playlist.id);

      const isPlaylist = SpotifyUrlHelper.isPlaylist(track.playlist.spotifyUrl);
      const hasMultipleTracks = playlistTracks.length > 1;

      if (isPlaylist && hasMultipleTracks) {
        const completedCount = this.m3uService.getCompletedTracksCount(playlistTracks);
        const totalCount = playlistTracks.length;

        console.debug(
          `Playlist "${track.playlist.name}": ${completedCount}/${totalCount} tracks completed`,
        );

        const playlistFolderPath = this.utilsService.getPlaylistFolderPath(
          track.playlist.name || "Unknown Playlist",
        );

        await this.m3uService.generateM3uFile(track.playlist, playlistTracks, playlistFolderPath);
      }
    } catch (err) {
      console.error("Failed to generate M3U file", err instanceof Error ? err.stack : String(err));
    }
  }
}
