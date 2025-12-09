import { PlaylistTypeEnum, type IPlaylist } from "@spotiarr/shared";
import { Playlist } from "../../../domain/entities/playlist.entity";
import { EventBus } from "../../../domain/events/event-bus";
import { SpotifyUrlHelper, SpotifyUrlType } from "../../../domain/helpers/spotify-url.helper";
import type { PlaylistRepository } from "../../../domain/repositories/playlist.repository";
import { SpotifyService } from "../../../infrastructure/external/spotify.service";
import { AppError } from "../../../presentation/middleware/error-handler";
import { SettingsService } from "../../services/settings.service";
import { TrackService } from "../../services/track.service";

interface PlaylistTrackDetail {
  artist: string;
  name: string;
  album?: string;
  albumYear?: number;
  trackNumber?: number;
  previewUrl?: string | null;
  albumCoverUrl?: string;
  primaryArtist?: string;
  primaryArtistImage?: string | null;
  artists?: { name: string; url: string | undefined }[];
  trackUrl?: string;
  albumUrl?: string;
  durationMs?: number;
  unavailable?: boolean;
}

interface PlaylistDetail {
  tracks: PlaylistTrackDetail[];
  name: string;
  image: string;
  type: string;
  owner?: string;
  ownerUrl?: string;
}

export class CreatePlaylistUseCase {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly spotifyService: SpotifyService,
    private readonly trackService: TrackService,
    private readonly settingsService: SettingsService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(playlistData: IPlaylist): Promise<IPlaylist> {
    const existing = await this.playlistRepository.findAll(false, {
      spotifyUrl: playlistData.spotifyUrl,
    });
    if (existing.length > 0) {
      throw new AppError(409, "playlist_already_exists");
    }

    let detail: PlaylistDetail | undefined;

    const playlist = new Playlist(playlistData);

    try {
      detail = await this.spotifyService.getPlaylistDetail(playlist.spotifyUrl);
      console.debug(`Playlist detail retrieved with ${detail.tracks?.length || 0} tracks`);

      let displayName = detail.name;
      if ((detail.type === "track" || detail.type === "album") && detail.tracks?.length > 0) {
        const firstTrack = detail.tracks[0];
        const artistName = firstTrack.primaryArtist || firstTrack.artist;
        if (artistName && detail.name) {
          displayName = `${artistName} - ${detail.name}`;
        }
      } else if (detail.type === "artist") {
        displayName = detail.name;
      }

      const artistImageUrl =
        detail.type === "artist"
          ? detail.image || null
          : detail.tracks?.[0]?.primaryArtistImage || null;

      const autoSubscribe = await this.settingsService.getBoolean("AUTO_SUBSCRIBE_NEW_PLAYLISTS");

      playlist.updateDetails(
        displayName,
        detail.type as PlaylistTypeEnum,
        detail.image,
        artistImageUrl ?? undefined,
        detail.owner,
        detail.ownerUrl,
      );

      if (autoSubscribe) {
        playlist.markAsSubscribed();
      }
    } catch (error) {
      console.error(
        `Error getting playlist details: ${playlist.spotifyUrl}`,
        error instanceof Error ? error.stack : String(error),
      );
      playlist.markAsError(error instanceof Error ? error.message : String(error));
    }

    const savedPlaylistEntity = await this.playlistRepository.save(playlist);
    const savedPlaylist = savedPlaylistEntity.toPrimitive();

    if (detail?.tracks && detail.tracks.length > 0) {
      await this.processTracks(savedPlaylist, detail.tracks);
    } else {
      console.warn(`No tracks found for playlist ${savedPlaylist.name}`);
    }

    this.eventBus.emit("playlists-updated");
    return savedPlaylist;
  }

  private async processTracks(playlist: IPlaylist, tracks: PlaylistTrackDetail[]): Promise<void> {
    console.debug(`Starting to process ${tracks.length} tracks for playlist ${playlist.name}`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const urlType = SpotifyUrlHelper.getUrlType(playlist.spotifyUrl);
    const isTrack = urlType === SpotifyUrlType.Track;
    const isAlbum = urlType === SpotifyUrlType.Album;
    const isArtist = urlType === SpotifyUrlType.Artist;

    for (const track of tracks) {
      try {
        if (!track.artist || !track.name) {
          console.warn(
            `Skipping track ${processedCount + skippedCount + 1}: Missing artist or name information`,
          );
          skippedCount++;
          continue;
        }

        if (track.unavailable === true) {
          console.warn(
            `Skipping unavailable track ${processedCount + skippedCount + 1}: ${track.artist} - ${track.name}`,
          );
          skippedCount++;
          continue;
        }

        const artistToUse =
          (isAlbum || isTrack || isArtist) && track.primaryArtist
            ? track.primaryArtist
            : track.artist;

        const useSinglesFallback = isTrack || isArtist;

        await this.trackService.create({
          artist: artistToUse,
          name: track.name,
          album: track.album ?? (useSinglesFallback ? "Singles" : playlist.name),
          albumYear: track.albumYear,
          trackNumber: isAlbum ? (track.trackNumber ?? processedCount + 1) : processedCount + 1,
          spotifyUrl: track.previewUrl ?? undefined,
          artists: track.artists,
          trackUrl: track.trackUrl,
          albumUrl: track.albumUrl,
          durationMs: track.durationMs,
          playlistId: playlist.id,
        });

        processedCount++;

        if (processedCount % 100 === 0) {
          console.debug(`Processed ${processedCount} tracks so far for playlist ${playlist.name}`);
        }
      } catch (error) {
        console.error(
          `Error creating track "${track?.artist || "Unknown"} - ${track?.name || "Unknown"}": ${error instanceof Error ? error.message : String(error)}`,
        );
        errorCount++;
      }
    }

    console.debug(
      `Finished processing playlist ${playlist.name}: ${processedCount} tracks processed, ${skippedCount} skipped, ${errorCount} errors`,
    );
  }
}
