import type { FollowedArtist } from "@spotiarr/shared";

export interface SpotifyArtistLookupPort {
  getArtistDetails(id: string): Promise<FollowedArtist>;
}
