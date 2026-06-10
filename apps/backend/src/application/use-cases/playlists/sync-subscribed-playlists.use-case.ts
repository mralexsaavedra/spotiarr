import { PlaylistTypeEnum, TrackStatusEnum } from "@spotiarr/shared";
import type { SpotifyCircuitBreakerPort } from "@/application/ports/spotify-circuit-breaker.port";
import { SpotifyService, type PlaylistTrack } from "@/application/services/spotify.service";
import { AppError } from "@/domain/errors/app-error";
import { EventBus } from "@/domain/events/event-bus";
import { SpotifyUrlHelper, SpotifyUrlType } from "@/domain/helpers/spotify-url.helper";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { TrackService } from "../../services/track.service";
import type { RetryTrackDownloadUseCase } from "../tracks/retry-track-download.use-case";

const PERMANENTLY_UNAVAILABLE_ERROR_CODES = new Set([
  "playlist_not_accessible",
  "playlist_not_found",
]);

function getTrackIdentityUrl(track: { trackUrl?: string; spotifyUrl?: string }): string {
  return track.trackUrl ?? track.spotifyUrl ?? "undefined";
}

export class SyncSubscribedPlaylistsUseCase {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly spotifyService: SpotifyService,
    private readonly trackService: TrackService,
    private readonly eventBus: EventBus,
    private readonly spotifyCircuitBreaker: SpotifyCircuitBreakerPort,
    private readonly retryTrackDownloadUseCase: RetryTrackDownloadUseCase,
  ) {}

  async execute(): Promise<void> {
    if (this.spotifyCircuitBreaker.isOpen()) {
      console.warn(
        "[SyncSubscribedPlaylists] Skipping run — Spotify circuit breaker is open. Will retry on next scheduled tick.",
      );
      return;
    }

    const subscribedPlaylists = await this.playlistRepository.findAll(false, { subscribed: true });

    for (const playlist of subscribedPlaylists) {
      // Skip synthetic playlists (album-by-id downloads) — they don't have a Spotify URL to sync
      if (!playlist.spotifyUrl || playlist.spotifyUrl.startsWith("spotiarr://")) {
        continue;
      }

      let tracks: PlaylistTrack[] = [];
      const spotifyUrl = playlist.spotifyUrl;
      try {
        const details = await this.spotifyService.getPlaylistDetail(spotifyUrl);
        tracks = details.tracks;

        playlist.updateDetails(
          details.name,
          details.type as PlaylistTypeEnum,
          details.image,
          playlist.artistImageUrl,
          details.owner,
          details.ownerUrl,
        );
        await this.playlistRepository.save(playlist);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const errorCode = error instanceof AppError ? error.errorCode : undefined;

        if (errorCode && PERMANENTLY_UNAVAILABLE_ERROR_CODES.has(errorCode)) {
          // Permanent: 3rd-party playlists are unreachable since Spotify API
          // Feb 2026 update. Unsubscribe so we stop retrying every cycle.
          playlist.markAsUnsubscribed();
          playlist.markAsError(message);
          await this.playlistRepository.update(playlist.id, playlist);
          console.warn(
            `[SyncSubscribedPlaylists] Unsubscribed permanently-unavailable playlist ${playlist.id}: ${errorCode}`,
          );
          continue;
        }

        if (errorCode === "circuit_open" || errorCode === "spotify_rate_limited") {
          // Transient: stop the loop entirely — every other playlist will fail
          // for the same reason and we'll just spam writes.
          console.warn(
            "[SyncSubscribedPlaylists] Aborting run — Spotify rate limited. Will retry on next scheduled tick.",
          );
          return;
        }

        playlist.markAsError(message);
        await this.playlistRepository.update(playlist.id, playlist);
        continue;
      }

      const urlType = SpotifyUrlHelper.getUrlType(spotifyUrl);
      const isTrack = urlType === SpotifyUrlType.Track;
      const isAlbum = urlType === SpotifyUrlType.Album;

      const existingTracks = await this.trackService.getAllByPlaylist(playlist.id);
      const existingTrackKeys = new Set(
        existingTracks.map((t) => `${t.artist}|${t.name}|${getTrackIdentityUrl(t)}`),
      );

      const tracksToCreate: { track: PlaylistTrack; index: number }[] = [];

      for (let i = 0; i < (tracks ?? []).length; i++) {
        const track = tracks[i];

        if (track.unavailable) continue;

        const artistToUse =
          (isAlbum || isTrack) && track.primaryArtist ? track.primaryArtist : track.artist;

        const track2Save = {
          artist: artistToUse,
          name: track.name,
          album: track.album ?? (isTrack ? "Singles" : playlist.name),
          albumYear: track.albumYear,
          trackNumber: isAlbum ? (track.trackNumber ?? i + 1) : i + 1,
          artists: track.artists,
          trackUrl: track.trackUrl,
          durationMs: track.durationMs,
        };

        const key = `${track2Save.artist}|${track2Save.name}|${getTrackIdentityUrl(track2Save)}`;

        if (!existingTrackKeys.has(key)) {
          tracksToCreate.push({ track: track, index: i });
          existingTrackKeys.add(key); // Prevent duplicates within the playlist
        }
      }

      if (tracksToCreate.length > 0) {
        const BATCH_SIZE = 10;
        for (let i = 0; i < tracksToCreate.length; i += BATCH_SIZE) {
          const batch = tracksToCreate.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async ({ track, index }) => {
              const artistToUse =
                (isAlbum || isTrack) && track.primaryArtist ? track.primaryArtist : track.artist;

              await this.trackService.create({
                artist: artistToUse,
                name: track.name,
                album: track.album ?? (isTrack ? "Singles" : playlist.name),
                albumYear: track.albumYear,
                trackNumber: isAlbum ? (track.trackNumber ?? index + 1) : index + 1,
                artists: track.artists,
                trackUrl: track.trackUrl,
                durationMs: track.durationMs,
                playlistId: playlist.id,
              });
            }),
          );
        }
        this.eventBus.emit("playlists-updated");
      }

      // Subscribed playlists should keep trying to complete. Tracks that failed
      // to download land in Error state with no automatic recovery (the startup
      // rescue only handles non-terminal statuses), so re-enqueue them here on
      // every sync. This is what lets newly-added tracks that hit a transient
      // failure eventually finish instead of stranding the playlist below 100%.
      const erroredTracks = existingTracks.filter((t) => t.status === TrackStatusEnum.Error);
      if (erroredTracks.length > 0) {
        for (const track of erroredTracks) {
          if (!track.id) continue;
          await this.retryTrackDownloadUseCase.execute(track.id);
        }
        this.eventBus.emit("playlists-updated");
      }
    }
  }
}
