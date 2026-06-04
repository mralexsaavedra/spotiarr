import type {
  DeezerArtistLookupPort,
  DeezerArtistResult,
} from "@/application/ports/deezer-artist-lookup.port";
import type { DeezerClient } from "./deezer.client";
import { pickBestDeezerArtistPicture } from "./picture";

export class DeezerArtistLookupAdapter implements DeezerArtistLookupPort {
  constructor(private readonly deezerClient: DeezerClient) {}

  async searchArtist(name: string): Promise<DeezerArtistResult | null> {
    try {
      const result = await this.deezerClient.searchArtist(name);
      if (!result) return null;
      return {
        id: result.id,
        name: result.name,
        picture: pickBestDeezerArtistPicture(result),
      };
    } catch {
      return null;
    }
  }

  async getArtistById(id: string): Promise<DeezerArtistResult | null> {
    try {
      const result = await this.deezerClient.getArtistById(id);
      if (!result) return null;
      return {
        id: result.id,
        name: result.name,
        picture: pickBestDeezerArtistPicture(result),
      };
    } catch {
      return null;
    }
  }
}
