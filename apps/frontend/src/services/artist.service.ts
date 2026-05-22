import type {
  ArtistDetail,
  ArtistRelease,
  FollowedArtist,
  NormalizedTrack,
} from "@spotiarr/shared";
import { ApiRoutes } from "@spotiarr/shared";
import { APP_CONFIG } from "@/config/app";
import { httpClient } from "./httpClient";

export const artistService = {
  getReleases: async (): Promise<ArtistRelease[]> => {
    return httpClient.get<ArtistRelease[]>(`${ApiRoutes.FEED}/releases`);
  },

  getFollowedArtists: async (): Promise<FollowedArtist[]> => {
    return httpClient.get<FollowedArtist[]>(`${ApiRoutes.FEED}/artists`);
  },

  getArtistDetail: async (
    artistId: string,
    limit: number = APP_CONFIG.PAGINATION.DEFAULT_PAGE_SIZE,
  ): Promise<ArtistDetail> => {
    const params = new URLSearchParams({ limit: limit.toString() });
    return httpClient.get<ArtistDetail>(`${ApiRoutes.ARTIST}/${artistId}?${params.toString()}`);
  },

  getArtistAlbums: async (
    artistId: string,
    limit: number = APP_CONFIG.PAGINATION.ARTIST_ALBUMS_LIMIT,
    offset: number = 0,
  ): Promise<ArtistRelease[]> => {
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    return httpClient.get<ArtistRelease[]>(
      `${ApiRoutes.ARTIST}/${artistId}/albums?${params.toString()}`,
    );
  },

  getAlbumTracks: async (artistId: string, albumId: string): Promise<NormalizedTrack[]> => {
    return httpClient.get<NormalizedTrack[]>(
      `${ApiRoutes.ARTIST}/${artistId}/albums/${albumId}/tracks`,
    );
  },
};
