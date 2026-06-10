import type { ArtistRelease } from "@spotiarr/shared";
import type { CatalogIdentity, FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { DeezerClient } from "./providers/deezer/deezer.client";
import type { MusicBrainzClient } from "./providers/musicbrainz/musicbrainz.client";

export type CatalogArtist = {
  id: string;
  name: string;
  imageUrl?: string | null;
};

export type ProviderDecision = "deezer" | "musicbrainz" | "spotify" | "unresolved";

export interface FeedSyncDecision {
  spotifyId: string;
  provider: ProviderDecision;
  albumsFound: number;
  newIdentityPersisted: boolean;
}

export interface ArtistDiscographyResult {
  albums: ArtistRelease[];
  decision: FeedSyncDecision;
}

/**
 * Orchestrates catalog release lookups through the provider fallback chain:
 * Deezer (primary) → MusicBrainz (secondary).
 *
 * All returned ArtistRelease items use the original Spotify artist id as
 * artistId so that downstream caches (ArtistReleaseCache) and UI contracts
 * remain unchanged.
 */
export class ReleaseFeedService {
  constructor(
    private readonly feedRepository: FeedRepositoryPort,
    private readonly deezerClient: DeezerClient,
    private readonly musicBrainzClient: MusicBrainzClient,
  ) {}

  /**
   * Fetch the full discography for a single artist through the provider chain.
   * Does NOT apply the 30-day lookback filter — returns all albums found.
   * Newly learned identities are persisted immediately.
   */
  async getArtistDiscography(artist: CatalogArtist): Promise<ArtistDiscographyResult> {
    const identities = await this.feedRepository.getArtistCatalogIdentities([artist.id]);
    const identity = identities[0];

    const { albums, provider, newIdentity, learnedIdentity } = await this.resolveDeezerMusicBrainz(
      artist,
      identity,
    );

    // Persist newly learned identity immediately for interactive path
    if (learnedIdentity) {
      await this.feedRepository.updateArtistCatalogIdentities([learnedIdentity]);
    }

    // Normalize artist metadata to preserve downstream cache/UI contracts
    const normalized = this.normalizeAlbumArtist(albums, artist);

    return {
      albums: normalized,
      decision: {
        spotifyId: artist.id,
        provider,
        albumsFound: normalized.length,
        newIdentityPersisted: newIdentity,
      },
    };
  }

  async getActiveArtistReleases(
    artists: CatalogArtist[],
    options?: { lookbackDays?: number },
  ): Promise<{ releases: ArtistRelease[]; decisions: FeedSyncDecision[] }> {
    const spotifyIds = artists.map((a) => a.id);
    const identities = await this.feedRepository.getArtistCatalogIdentities(spotifyIds);
    const identityMap = new Map(identities.map((i) => [i.spotifyId, i]));

    const releasesPerArtist: ArtistRelease[][] = [];
    const decisions: FeedSyncDecision[] = [];
    const identitiesToPersist: Array<{
      spotifyId: string;
      deezerId?: string | null;
      mbid?: string | null;
    }> = [];

    for (const artist of artists) {
      const identity = identityMap.get(artist.id);
      const { albums, provider, newIdentity, learnedIdentity } =
        await this.resolveDeezerMusicBrainz(artist, identity);

      // Normalize artist metadata to preserve downstream cache/UI contracts
      releasesPerArtist.push(this.normalizeAlbumArtist(albums, artist));

      decisions.push({
        spotifyId: artist.id,
        provider,
        albumsFound: albums.length,
        newIdentityPersisted: newIdentity,
      });

      if (learnedIdentity) {
        identitiesToPersist.push(learnedIdentity);
      }
    }

    // Persist newly learned identities in bulk
    if (identitiesToPersist.length > 0) {
      await this.feedRepository.updateArtistCatalogIdentities(identitiesToPersist);
    }

    const flat = releasesPerArtist.flat();

    const lookbackDays = options?.lookbackDays ?? 30;
    const recent = this.filterByLookback(flat, lookbackDays);
    recent.sort((a, b) => {
      const da = a.releaseDate ?? "";
      const db = b.releaseDate ?? "";
      return db.localeCompare(da);
    });

    this.logDecisions(decisions);

    return { releases: recent, decisions };
  }

  private async resolveDeezerMusicBrainz(
    artist: CatalogArtist,
    identity: CatalogIdentity | undefined,
  ): Promise<{
    albums: ArtistRelease[];
    provider: ProviderDecision;
    newIdentity: boolean;
    learnedIdentity?: { spotifyId: string; deezerId?: string | null; mbid?: string | null };
  }> {
    let provider: ProviderDecision = "unresolved";
    let albums: ArtistRelease[] = [];
    let newIdentity = false;
    let learnedIdentity:
      | { spotifyId: string; deezerId?: string | null; mbid?: string | null }
      | undefined;

    // 1. Deezer primary
    if (identity?.deezerId) {
      albums = await this.deezerClient.getArtistAlbums(identity.deezerId);
      provider = "deezer";
    } else {
      const deezerArtist = await this.deezerClient.searchArtist(artist.name);
      if (deezerArtist) {
        albums = await this.deezerClient.getArtistAlbums(deezerArtist.id);
        provider = "deezer";
        learnedIdentity = { spotifyId: artist.id, deezerId: String(deezerArtist.id) };
        newIdentity = true;
      }
    }

    // 2. MusicBrainz fallback
    if (albums.length === 0) {
      if (identity?.mbid) {
        albums = await this.musicBrainzClient.getArtistReleaseGroups(identity.mbid);
        provider = "musicbrainz";
      } else {
        const mbArtist = await this.musicBrainzClient.searchArtist(artist.name);
        if (mbArtist) {
          albums = await this.musicBrainzClient.getArtistReleaseGroups(mbArtist.id);
          provider = "musicbrainz";
          learnedIdentity = { spotifyId: artist.id, mbid: mbArtist.id };
          newIdentity = true;
        }
      }
    }

    return { albums, provider, newIdentity, learnedIdentity };
  }

  private normalizeAlbumArtist(
    albums: ArtistRelease[],
    artist: { id: string; name: string; imageUrl?: string | null },
  ): ArtistRelease[] {
    return albums.map((album) => ({
      ...album,
      artistId: artist.id,
      artistName: artist.name,
      artistImageUrl: artist.imageUrl ?? null,
    }));
  }

  private filterByLookback(releases: ArtistRelease[], lookbackDays: number): ArtistRelease[] {
    // Date-only cutoff: a datetime cutoff flickers N-day-old releases in/out by time-of-day and timezone.
    const now = new Date();
    const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - lookbackDays);

    return releases.filter((item) => {
      if (!item.releaseDate) return false;

      const parts = item.releaseDate.split("-");
      const year = Number(parts[0]);
      let month = parts.length >= 2 ? Number(parts[1]) - 1 : 0;
      let day = parts.length >= 3 ? Number(parts[2]) : 1;

      if (Number.isNaN(year) || year <= 0) return false;
      if (Number.isNaN(month) || month < 0 || month > 11) month = 0;
      if (Number.isNaN(day) || day <= 0 || day > 31) day = 1;

      const releaseDate = new Date(year, month, day);
      return releaseDate >= cutoff;
    });
  }

  private logDecisions(decisions: FeedSyncDecision[]): void {
    const counts = decisions.reduce(
      (acc, d) => {
        acc[d.provider]++;
        return acc;
      },
      { deezer: 0, musicbrainz: 0, spotify: 0, unresolved: 0 },
    );

    const newIds = decisions.filter((d) => d.newIdentityPersisted).length;

    console.log(
      `[ReleaseFeedService] Sync decisions — Deezer: ${counts.deezer}, MusicBrainz: ${counts.musicbrainz}, Spotify: ${counts.spotify}, Unresolved: ${counts.unresolved}. New identities: ${newIds}`,
    );
  }
}
