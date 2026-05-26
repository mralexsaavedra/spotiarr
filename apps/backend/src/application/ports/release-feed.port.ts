import type { ArtistRelease } from "@spotiarr/shared";

type CatalogArtist = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

export interface ReleaseFeedPort {
  getActiveArtistReleases(
    artists: CatalogArtist[],
    options?: { lookbackDays?: number },
  ): Promise<{ releases: ArtistRelease[]; decisions?: unknown[] }>;
  getArtistDiscography(input: {
    id: string;
    name: string;
    imageUrl?: string | null;
  }): Promise<{ albums: ArtistRelease[]; decision?: unknown }>;
}
