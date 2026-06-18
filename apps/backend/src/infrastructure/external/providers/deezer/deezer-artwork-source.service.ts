import type {
  ArtworkBackfillCandidate,
  ArtworkBackfillExternalSourcePort,
} from "@/application/ports/artwork-backfill-sources.port";
import { logger } from "@/infrastructure/logging/logger";
import { pickBestCover } from "./cover-url";
import type { DeezerClient } from "./deezer.client";

export class DeezerArtworkSourceService implements ArtworkBackfillExternalSourcePort {
  constructor(private readonly deezerClient: Pick<DeezerClient, "searchArtist" | "searchAlbum">) {}

  async findArtistImageUrl(candidate: ArtworkBackfillCandidate): Promise<string | null> {
    try {
      const artist = await this.deezerClient.searchArtist(candidate.artistName);
      if (!artist) return null;
      return (
        artist.picture_xl || artist.picture_big || artist.picture_medium || artist.picture || null
      );
    } catch (err) {
      logger.warn({ component: "deezer-artwork-source", err }, "findArtistImageUrl error");
      return null;
    }
  }

  async findAlbumCoverUrl(candidate: ArtworkBackfillCandidate): Promise<string | null> {
    if (!candidate.albumName) return null;
    try {
      const album = await this.deezerClient.searchAlbum(candidate.artistName, candidate.albumName);
      if (!album) return null;
      return pickBestCover(album) ?? null;
    } catch (err) {
      logger.warn({ component: "deezer-artwork-source", err }, "findAlbumCoverUrl error");
      return null;
    }
  }
}
