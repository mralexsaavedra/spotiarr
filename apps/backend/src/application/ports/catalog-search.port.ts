import type { ArtistRelease, FollowedArtist, NormalizedTrack } from "@spotiarr/shared";

export interface CatalogSearchResult {
  tracks: NormalizedTrack[];
  albums: ArtistRelease[];
  artists: FollowedArtist[];
}

export interface CatalogSearchPort {
  searchCatalog(
    query: string,
    types: string[],
    limits: { track?: number; album?: number; artist?: number },
  ): Promise<CatalogSearchResult>;
}
