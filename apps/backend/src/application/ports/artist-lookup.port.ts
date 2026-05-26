export interface SpotifyArtistLookupPort {
  getArtistDetails(id: string): Promise<{
    name: string;
    image: string | null;
    spotifyUrl: string | null;
    followers: number | null;
    genres: string[];
  }>;
}
