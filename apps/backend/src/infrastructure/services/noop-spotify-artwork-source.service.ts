import type {
  ArtworkBackfillCandidate,
  ArtworkBackfillSpotifySourcePort,
} from "@/application/ports/artwork-backfill-sources.port";

export class NoopSpotifyArtworkSourceService implements ArtworkBackfillSpotifySourcePort {
  async findArtistImageUrl(_candidate: ArtworkBackfillCandidate): Promise<string | null> {
    return null;
  }

  async findAlbumCoverUrl(_candidate: ArtworkBackfillCandidate): Promise<string | null> {
    return null;
  }
}
