import { ApiRoutes, ArtistDetail, ArtistRelease } from "@spotiarr/shared";
import { FollowedArtist } from "../types/artist";
import { httpClient } from "./httpClient";

export const artistService = {
  getReleases: async (): Promise<ArtistRelease[]> => {
    return httpClient.get<ArtistRelease[]>(`${ApiRoutes.FEED}/releases`);
  },

  getFollowedArtists: async (): Promise<FollowedArtist[]> => {
    return httpClient.get<FollowedArtist[]>(`${ApiRoutes.FEED}/artists`);
  },

  getArtistDetail: async (artistId: string, limit: number = 12): Promise<ArtistDetail> => {
    const params = new URLSearchParams({ limit: limit.toString() });
    return httpClient.get<ArtistDetail>(`${ApiRoutes.ARTIST}/${artistId}?${params.toString()}`);
  },

  getArtistAlbums: async (
    artistId: string,
    limit: number = 50,
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
};
