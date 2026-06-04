export interface DeezerArtistResult {
  id: number | string;
  name: string;
  picture: string | null;
}

export interface DeezerArtistLookupPort {
  searchArtist(name: string): Promise<DeezerArtistResult | null>;
  getArtistById(id: string): Promise<DeezerArtistResult | null>;
}
