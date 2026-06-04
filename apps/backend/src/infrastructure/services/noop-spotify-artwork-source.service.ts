import type {
  ArtworkBackfillCandidate,
  ArtworkBackfillExternalSourcePort,
} from "@/application/ports/artwork-backfill-sources.port";

export class NoopSpotifyArtworkSourceService implements ArtworkBackfillExternalSourcePort {
  async findArtistImageUrl(_candidate: ArtworkBackfillCandidate): Promise<string | null> {
    return null;
  }

  async findAlbumCoverUrl(_candidate: ArtworkBackfillCandidate): Promise<string | null> {
    return null;
  }
}
