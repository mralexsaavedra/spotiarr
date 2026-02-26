import { NormalizedTrack } from "@spotiarr/shared";
import { SpotifyAlbum, SpotifyTrack } from "./spotify.types";

export class SpotifyTrackMapper {
  static toNormalizedTrack(
    track: SpotifyTrack,
    context?: {
      album?: SpotifyAlbum;
      albumCoverUrl?: string;
      primaryArtistImage?: string | null;
      isUnavailable?: boolean;
    },
  ): NormalizedTrack & { unavailable?: boolean } {
    // Album info resolution
    const album = context?.album ?? track.album;
    const albumName = album?.name;
    const albumUrl = album?.external_urls?.spotify;
    const albumCoverUrl = context?.albumCoverUrl ?? album?.images?.[0]?.url;

    // Release date parsing
    const releaseDate = album?.release_date;
    const albumYear = releaseDate ? parseInt(releaseDate.substring(0, 4)) : undefined;

    // Artist resolution
    const artistName = track.artists.map((a) => a.name).join(", ");
    const primaryArtist = track.artists[0]?.name;
    const artists = track.artists.map((a) => ({
      name: a.name,
      url: a.external_urls?.spotify,
    }));

    return {
      name: track.name,
      artist: artistName,
      primaryArtist,
      primaryArtistImage: context?.primaryArtistImage ?? null,
      artists,
      trackUrl: track.external_urls?.spotify,
      album: albumName,
      albumUrl,
      albumCoverUrl,
      albumYear,
      trackNumber: track.track_number,
      discNumber: track.disc_number,
      totalTracks: album?.total_tracks,
      previewUrl: track.preview_url,
      durationMs: track.duration_ms,
      unavailable: context?.isUnavailable ?? undefined,
    } as NormalizedTrack & { unavailable?: boolean };
  }
}
