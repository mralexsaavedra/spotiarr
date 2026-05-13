import type { ArtistRelease } from "@spotiarr/shared";
import type { FeedRepository } from "@/infrastructure/database/feed.repository";
import type { DeezerClient } from "./providers/deezer/deezer.client";
import type { MusicBrainzClient } from "./providers/musicbrainz/musicbrainz.client";
import type { SpotifyUserLibraryService } from "./spotify-user-library.service";

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

/**
 * Orchestrates catalog release lookups through the provider fallback chain:
 * Deezer (primary) → MusicBrainz (secondary) → Spotify (last resort).
 *
 * All returned ArtistRelease items use the original Spotify artist id as
 * artistId so that downstream caches (ArtistReleaseCache) and UI contracts
 * remain unchanged.
 */
export class ReleaseFeedService {
  constructor(
    private readonly feedRepository: FeedRepository,
    private readonly deezerClient: DeezerClient,
    private readonly musicBrainzClient: MusicBrainzClient,
    private readonly spotifyUserLibrarySyncService: SpotifyUserLibraryService,
  ) {}

  async getActiveArtistReleases(
    artists: CatalogArtist[],
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
      let provider: ProviderDecision = "unresolved";
      let albums: ArtistRelease[] = [];
      let newIdentity = false;

      // 1. Deezer primary
      if (identity?.deezerId) {
        albums = await this.deezerClient.getArtistAlbums(identity.deezerId);
        provider = "deezer";
      } else {
        const deezerArtist = await this.deezerClient.searchArtist(artist.name);
        if (deezerArtist) {
          albums = await this.deezerClient.getArtistAlbums(deezerArtist.id);
          provider = "deezer";
          identitiesToPersist.push({ spotifyId: artist.id, deezerId: String(deezerArtist.id) });
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
            identitiesToPersist.push({ spotifyId: artist.id, mbid: mbArtist.id });
            newIdentity = true;
          }
        }
      }

      // 3. Spotify last resort
      if (albums.length === 0) {
        const spotifyReleases = await this.spotifyUserLibrarySyncService.getActiveArtistReleases([
          artist,
        ]);
        albums = spotifyReleases;
        provider = spotifyReleases.length > 0 ? "spotify" : "unresolved";
      }

      // Normalize artist metadata to preserve downstream cache/UI contracts
      releasesPerArtist.push(
        albums.map((album) => ({
          ...album,
          artistId: artist.id,
          artistName: artist.name,
          artistImageUrl: artist.imageUrl ?? null,
        })),
      );

      decisions.push({
        spotifyId: artist.id,
        provider,
        albumsFound: albums.length,
        newIdentityPersisted: newIdentity,
      });
    }

    // Persist newly learned identities in bulk
    if (identitiesToPersist.length > 0) {
      await this.feedRepository.updateArtistCatalogIdentities(identitiesToPersist);
    }

    const flat = releasesPerArtist.flat();

    const recent = this.filterByLookback(flat);
    recent.sort((a, b) => {
      const da = a.releaseDate ?? "";
      const db = b.releaseDate ?? "";
      return db.localeCompare(da);
    });

    this.logDecisions(decisions);

    return { releases: recent, decisions };
  }

  private filterByLookback(releases: ArtistRelease[]): ArtistRelease[] {
    // Default to 30 days when settings are unavailable; do not block sync
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

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
