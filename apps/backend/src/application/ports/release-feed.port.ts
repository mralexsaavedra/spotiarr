import type { ArtistRelease, FollowedArtist } from "@spotiarr/shared";

export interface ReleaseFeedPort {
  getActiveArtistReleases(
    artists: FollowedArtist[],
    lookbackDays: number,
  ): Promise<{ releases: ArtistRelease[] }>;
  getArtistDiscography(input: {
    spotifyArtistId: string;
    artistName: string;
    limit: number;
    offset?: number;
  }): Promise<ArtistRelease[]>;
}
