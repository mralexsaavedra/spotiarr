import type { NormalizedTrack } from "@spotiarr/shared";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import { DeezerClient } from "@/infrastructure/external/providers/deezer/deezer.client";
import { MusicBrainzClient } from "@/infrastructure/external/providers/musicbrainz/musicbrainz.client";
import { SpotifyAlbumClient } from "@/infrastructure/external/spotify-album.client";

/**
 * Orchestrates album track resolution through the provider fallback chain:
 * Deezer (primary) → MusicBrainz (secondary) → Spotify (terminal fallback).
 *
 * Persisted album identities (deezerAlbumId, mbAlbumId) are stored in
 * ArtistAlbumCache to avoid repeated discovery searches.
 */
export class GetAlbumTracksUseCase {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly deezerClient: DeezerClient,
    private readonly musicBrainzClient: MusicBrainzClient,
    private readonly spotifyAlbumClient: SpotifyAlbumClient,
  ) {}

  async execute(spotifyArtistId: string, albumId: string): Promise<NormalizedTrack[]> {
    // 1. Read cached album + artist name
    const albumCache = await this.feedRepository.getArtistAlbumWithArtist(spotifyArtistId, albumId);

    const artistName = albumCache?.artistName ?? "Unknown Artist";
    const albumName = albumCache?.albumName ?? "";

    // 2. Deezer primary path
    if (albumCache?.deezerAlbumId) {
      const tracks = await this.deezerClient.getAlbumTracks(albumCache.deezerAlbumId);
      if (tracks.length > 0) {
        return tracks;
      }
    }

    // Try Deezer search-by-name if no persisted ID or empty result
    const deezerAlbum = await this.deezerClient.searchAlbum(artistName, albumName);
    if (deezerAlbum) {
      const tracks = await this.deezerClient.getAlbumTracks(deezerAlbum.id);
      if (tracks.length > 0) {
        // Persist the discovered identity for fast subsequent loads
        if (albumCache) {
          await this.feedRepository.updateArtistAlbumIdentities(albumCache.id, {
            deezerAlbumId: String(deezerAlbum.id),
          });
        }
        return tracks;
      }
    }

    // 3. MusicBrainz fallback
    // Use persisted mbAlbumId, or fall back to the raw albumId if it looks like a MB UUID.
    const mbIdentity = albumCache?.mbAlbumId ?? (this.isMusicBrainzId(albumId) ? albumId : null);
    if (mbIdentity) {
      const tracks = await this.musicBrainzClient.getReleaseTracks(mbIdentity);
      if (tracks.length > 0) {
        // Persist the discovered identity for fast subsequent loads
        if (albumCache && !albumCache.mbAlbumId) {
          await this.feedRepository.updateArtistAlbumIdentities(albumCache.id, {
            mbAlbumId: mbIdentity,
          });
        }
        return tracks;
      }
    }

    // 4. Spotify terminal fallback — only when the albumId looks like a Spotify ID
    // to avoid passing Deezer numeric / MB UUID IDs to Spotify.
    if (this.isSpotifyAlbumId(albumId)) {
      return this.spotifyAlbumClient.getAlbumTracks(albumId);
    }

    return [];
  }

  /**
   * Spotify album IDs are 22-character alphanumeric strings.
   * Deezer IDs are numeric; MusicBrainz IDs are UUIDs.
   */
  private isSpotifyAlbumId(id: string): boolean {
    return /^[a-zA-Z0-9]{22}$/.test(id);
  }

  /**
   * MusicBrainz release-group IDs are standard UUIDs.
   */
  private isMusicBrainzId(id: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  }
}
