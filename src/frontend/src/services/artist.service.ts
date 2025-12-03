import { ArtistDetail, ArtistRelease } from "@spotiarr/shared";
import { httpClient } from "./httpClient";

export const artistService = {
  getReleases: async (): Promise<ArtistRelease[]> => {
    return httpClient.get<ArtistRelease[]>("/feed/releases");
  },

  getFollowedArtists: async (): Promise<
    {
      id: string;
      name: string;
      image: string | null;
      spotifyUrl: string | null;
    }[]
  > => {
    return httpClient.get<
      {
        id: string;
        name: string;
        image: string | null;
        spotifyUrl: string | null;
      }[]
    >("/feed/artists");
  },

  getArtistDetail: async (artistId: string, limit: number = 12): Promise<ArtistDetail> => {
    return httpClient.get<ArtistDetail>(`/artist/${artistId}?limit=${limit}`);
  },

  getArtistAlbums: async (
    artistId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<ArtistRelease[]> => {
    return httpClient.get<ArtistRelease[]>(
      `/artist/${artistId}/albums?limit=${limit}&offset=${offset}`,
    );
  },
};
