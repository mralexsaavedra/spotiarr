import type { FollowedArtist } from "@spotiarr/shared";

export interface SpotifyUserLibraryPort {
  getFollowedArtists(): Promise<FollowedArtist[]>;
  clearCache(): void;
}
