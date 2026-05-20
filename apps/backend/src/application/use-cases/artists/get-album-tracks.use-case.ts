import type { NormalizedTrack } from "@spotiarr/shared";
import type { AlbumTracksCachePort } from "@/application/ports/album-tracks-cache.port";
import {
  isDeezerAlbumId,
  isMusicBrainzId,
  isSpotifyAlbumId,
} from "@/application/utils/album-id.utils";
import { NoopAlbumTracksCache } from "@/infrastructure/cache/noop-album-tracks-cache";
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
 *
 * An optional `albumTracksCache` port (default: NoopAlbumTracksCache) can be
 * wired to short-circuit the provider cascade for repeat requests (e.g. Redis TTL 300s).
 */
export class GetAlbumTracksUseCase {
  private readonly albumTracksCache: AlbumTracksCachePort;

  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly deezerClient: DeezerClient,
    private readonly musicBrainzClient: MusicBrainzClient,
    private readonly spotifyAlbumClient: SpotifyAlbumClient,
    albumTracksCache: AlbumTracksCachePort = new NoopAlbumTracksCache(),
  ) {
    this.albumTracksCache = albumTracksCache;
  }

  async execute(spotifyArtistId: string, albumId: string): Promise<NormalizedTrack[]> {
    const cached = await this.albumTracksCache.get(spotifyArtistId, albumId);
    if (cached !== null) {
      return cached;
    }

    let albumCache = await this.feedRepository.getArtistAlbumWithArtist(spotifyArtistId, albumId);

    // Fallback: album may live in the recent-releases cache without a matching
    // entry in the discography cache (feed-sync populates them independently).
    if (!albumCache) {
      const releaseCache = await this.feedRepository.getArtistReleaseWithArtist(
        spotifyArtistId,
        albumId,
      );
      if (releaseCache) {
        albumCache = {
          id: releaseCache.id,
          spotifyArtistId,
          albumId: releaseCache.albumId,
          albumName: releaseCache.albumName,
          albumType: releaseCache.albumType,
          releaseDate: releaseCache.releaseDate,
          coverUrl: releaseCache.coverUrl,
          spotifyUrl: releaseCache.spotifyUrl,
          totalTracks: null,
          deezerAlbumId: isDeezerAlbumId(albumId) ? albumId : null,
          mbAlbumId: isMusicBrainzId(albumId) ? albumId : null,
          artistName: releaseCache.artistName,
        };
      }
    }

    const albumName = albumCache?.albumName ?? "";

    const tracks = await this.resolveViaCascade(spotifyArtistId, albumId, albumCache);

    // Providers may omit the album title on track-list responses (Deezer /album/:id/tracks
    // does not return nested album info). Backfill from the persisted album metadata so
    // downstream views show the album name instead of "Unknown Album".
    const tracksWithAlbum = albumName
      ? tracks.map((t) => ({ ...t, album: t.album?.trim() ? t.album : albumName }))
      : tracks;

    await this.albumTracksCache.set(spotifyArtistId, albumId, tracksWithAlbum);

    return tracksWithAlbum;
  }

  /**
   * Runs the full provider cascade: Deezer → MusicBrainz → Spotify.
   * Persists discovered identities (deezerAlbumId, mbAlbumId) for future fast loads.
   */
  private async resolveViaCascade(
    spotifyArtistId: string,
    albumId: string,
    albumCache: Awaited<ReturnType<FeedRepository["getArtistAlbumWithArtist"]>>,
  ): Promise<NormalizedTrack[]> {
    const artistName = albumCache?.artistName ?? "Unknown Artist";
    const albumName = albumCache?.albumName ?? "";

    // 2. Deezer primary path
    const deezerDirectId = albumCache?.deezerAlbumId ?? (isDeezerAlbumId(albumId) ? albumId : null);
    if (deezerDirectId) {
      const tracks = await this.deezerClient.getAlbumTracks(deezerDirectId);
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
    const mbIdentity = albumCache?.mbAlbumId ?? (isMusicBrainzId(albumId) ? albumId : null);
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
    if (isSpotifyAlbumId(albumId)) {
      return this.spotifyAlbumClient.getAlbumTracks(albumId);
    }

    return [];
  }
}
