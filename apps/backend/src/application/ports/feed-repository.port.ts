import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";

export interface ArtistAlbumCacheWithArtist {
  id: string;
  spotifyArtistId: string;
  albumId: string;
  albumName: string;
  albumType: string | null;
  releaseDate: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null;
  totalTracks: number | null;
  deezerAlbumId: string | null;
  mbAlbumId: string | null;
  artistName: string;
}

export interface ArtistReleaseCacheWithArtist {
  id: string;
  artistId: string;
  albumId: string;
  albumName: string;
  albumType: string | null;
  releaseDate: string | null;
  coverUrl: string | null;
  spotifyUrl: string | null;
  artistName: string;
}

export interface FeedRepositoryPort {
  getArtistBySpotifyId(spotifyId: string): Promise<FollowedArtist | null>;
  getReleases(lookbackDays: number): Promise<ArtistRelease[]>;
  getArtists(): Promise<FollowedArtist[]>;
  upsertArtists(artists: FollowedArtist[]): Promise<void>;
  upsertReleases(releases: ArtistRelease[]): Promise<void>;
  getArtistAlbumWithArtist(
    spotifyArtistId: string,
    albumId: string,
  ): Promise<ArtistAlbumCacheWithArtist | null>;
  getArtistReleaseWithArtist(
    artistId: string,
    albumId: string,
  ): Promise<ArtistReleaseCacheWithArtist | null>;
  updateArtistAlbumIdentities(
    id: string,
    identities: { deezerAlbumId?: string | null; mbAlbumId?: string | null },
  ): Promise<void>;
  getArtistAlbumsFreshness(spotifyArtistId: string): Promise<Date | null>;
  getArtistAlbums(
    spotifyArtistId: string,
    limit: number,
    offset?: number,
  ): Promise<ArtistRelease[]>;
  upsertArtistAlbums(albums: ArtistRelease[]): Promise<void>;
}
