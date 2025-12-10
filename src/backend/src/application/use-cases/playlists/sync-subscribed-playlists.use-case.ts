import { PlaylistTypeEnum } from "@spotiarr/shared";
import { EventBus } from "@/domain/events/event-bus";
import { SpotifyUrlHelper, SpotifyUrlType } from "@/domain/helpers/spotify-url.helper";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import { SpotifyService, type PlaylistTrack } from "@/domain/services/spotify.service";
import { TrackService } from "../../services/track.service";

export class SyncSubscribedPlaylistsUseCase {
  constructor(
    private readonly playlistRepository: PlaylistRepository,
    private readonly spotifyService: SpotifyService,
    private readonly trackService: TrackService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(): Promise<void> {
    const subscribedPlaylists = await this.playlistRepository.findAll(false, { subscribed: true });

    for (const playlist of subscribedPlaylists) {
      let tracks: PlaylistTrack[] = [];
      try {
        const details = await this.spotifyService.getPlaylistDetail(playlist.spotifyUrl);
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
        playlist.markAsError(error instanceof Error ? error.message : String(error));
        await this.playlistRepository.update(playlist.id, playlist);
        continue;
      }

      const urlType = SpotifyUrlHelper.getUrlType(playlist.spotifyUrl);
      const isTrack = urlType === SpotifyUrlType.Track;
      const isAlbum = urlType === SpotifyUrlType.Album;

      const existingTracks = await this.trackService.getAllByPlaylist(playlist.id);
      const existingTrackKeys = new Set(
        existingTracks.map((t) => `${t.artist}|${t.name}|${t.spotifyUrl || "undefined"}`),
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
          spotifyUrl: track.previewUrl ?? undefined,
          artists: track.artists,
          trackUrl: track.trackUrl,
          durationMs: track.durationMs,
        };

        const key = `${track2Save.artist}|${track2Save.name}|${track2Save.spotifyUrl || "undefined"}`;

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
                spotifyUrl: track.previewUrl ?? undefined,
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
    }
  }
}
