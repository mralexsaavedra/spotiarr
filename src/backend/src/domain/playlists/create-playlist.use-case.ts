import { PlaylistTypeEnum, type IPlaylist } from "@spotiarr/shared";
import { SettingsService } from "../../application/services/settings.service";
import { TrackService } from "../../application/services/track.service";
import { SpotifyService } from "../../infrastructure/external/spotify.service";
import { SpotifyUrlHelper, SpotifyUrlType } from "../helpers/spotify-url.helper";
import type { PlaylistRepository } from "../interfaces/playlist.repository";

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
}

export class CreatePlaylistUseCase {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly spotifyService: SpotifyService,
    private readonly trackService: TrackService,
    private readonly settingsService: SettingsService,
  ) {}

  async execute(playlist: IPlaylist): Promise<IPlaylist> {
    let detail: PlaylistDetail | undefined;
    let playlist2Save: IPlaylist;

    // Step 1: Fetch playlist details from Spotify
    try {
      detail = await this.spotifyService.getPlaylistDetail(playlist.spotifyUrl);
      console.debug(`Playlist detail retrieved with ${detail.tracks?.length || 0} tracks`);

      // Format name for tracks, albums and artists
      let displayName = detail.name;
      if ((detail.type === "track" || detail.type === "album") && detail.tracks?.length > 0) {
        const firstTrack = detail.tracks[0];
        const artistName = firstTrack.primaryArtist || firstTrack.artist;
        if (artistName && detail.name) {
          displayName = `${artistName} - ${detail.name}`;
        }
      } else if (detail.type === "artist") {
        // For artists, keep just the artist name
        displayName = detail.name;
      }

      const artistImageUrl =
        detail.type === "artist"
          ? detail.image || null
          : detail.tracks?.[0]?.primaryArtistImage || null;

      const autoSubscribe = await this.settingsService.getBoolean("AUTO_SUBSCRIBE_NEW_PLAYLISTS");

      playlist2Save = {
        ...playlist,
        name: displayName,
        coverUrl: detail.image,
        type: detail.type as PlaylistTypeEnum,
        artistImageUrl: artistImageUrl ?? undefined,
        subscribed: autoSubscribe,
      };
    } catch (error) {
      console.error(
        `Error getting playlist details: ${playlist.spotifyUrl}`,
        error instanceof Error ? error.stack : String(error),
      );
      playlist2Save = {
        ...playlist,
        error: error instanceof Error ? error.message : String(error),
      };
    }

    // Step 2: Save playlist
    const savedPlaylist = await this.playlistRepository.save(playlist2Save);

    // Step 3: Process tracks if available
    if (detail?.tracks && detail.tracks.length > 0) {
      await this.processTracks(savedPlaylist, detail.tracks);
    } else {
      console.warn(`No tracks found for playlist ${savedPlaylist.name}`);
    }

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
