import type { AlbumType, ArtistRelease, FollowedArtist, NormalizedTrack } from "@spotiarr/shared";
import type {
  CatalogSearchPort,
  CatalogSearchResult,
} from "@/application/ports/catalog-search.port";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import { namesMatch } from "../normalize-name";
import type { DeezerArtist, DeezerClient, DeezerTrack } from "./deezer.client";

/**
 * Implements CatalogSearchPort using Deezer as the primary search provider.
 *
 * Artist ID resolution (Design D1):
 * - For each Deezer artist result, look up FollowedArtistCache by the Deezer numeric ID.
 * - If a cache hit exists, surface the Spotify ID (the stable internal PK).
 * - If no cache entry, surface the Deezer ID so the frontend can still navigate.
 *
 * Track results include albumId for download routing via album path (Design D4).
 */
export class DeezerCatalogSearchAdapter implements CatalogSearchPort {
  constructor(
    private readonly deezerClient: DeezerClient,
    private readonly feedRepository: FeedRepositoryPort,
  ) {}

  async searchCatalog(
    query: string,
    types: string[],
    limits: { track?: number; album?: number; artist?: number },
  ): Promise<CatalogSearchResult> {
    // Fetch raw Deezer artists once and reuse across artist + track resolution
    // to avoid a duplicate /search/artist round-trip (Bug 4 optimization).
    const needsArtistContext = types.includes("artist") || types.includes("track");
    const rawArtists = needsArtistContext
      ? await this.safeSearchArtistList(query, Math.max(limits.artist ?? 5, 1))
      : [];

    const [artists, albums, tracks] = await Promise.all([
      types.includes("artist")
        ? this.resolveArtists(rawArtists)
        : Promise.resolve<FollowedArtist[]>([]),
      types.includes("album")
        ? this.searchAlbums(query, limits.album ?? 10)
        : Promise.resolve<ArtistRelease[]>([]),
      types.includes("track")
        ? this.searchTracks(query, limits.track ?? 10, rawArtists[0])
        : Promise.resolve<NormalizedTrack[]>([]),
    ]);

    return { tracks, albums, artists };
  }

  private async safeSearchArtistList(query: string, limit: number): Promise<DeezerArtist[]> {
    try {
      return await this.deezerClient.searchArtistList(query, limit);
    } catch {
      return [];
    }
  }

  private async resolveArtists(deezerArtists: DeezerArtist[]): Promise<FollowedArtist[]> {
    return Promise.all(
      deezerArtists.map(async (deezerArtist): Promise<FollowedArtist> => {
        // Prefer the fresh high-res Deezer picture over any cached low-res image
        // persisted by earlier sync runs (Issue 1: cached images were saved using
        // the small `picture` field; new search result carries `picture_xl`).
        const freshImage =
          deezerArtist.picture_xl ??
          deezerArtist.picture_big ??
          deezerArtist.picture_medium ??
          deezerArtist.picture ??
          null;

        const cached = await this.feedRepository.getArtistByAnyId(String(deezerArtist.id));
        if (cached) {
          return { ...cached, image: freshImage ?? cached.image ?? null };
        }
        // Artist not in cache — surface the Deezer ID as the identifier
        return {
          id: String(deezerArtist.id),
          name: deezerArtist.name,
          image: freshImage,
          spotifyUrl: null,
        };
      }),
    );
  }

  private async searchAlbums(query: string, limit: number): Promise<ArtistRelease[]> {
    try {
      const deezerAlbums = await this.deezerClient.searchAlbumList(query, limit);

      return deezerAlbums.map(
        (album): ArtistRelease => ({
          artistId: album.artist ? String(album.artist.id) : "unknown",
          artistName: album.artist?.name ?? "Unknown Artist",
          artistImageUrl: null,
          albumId: String(album.id),
          albumName: album.title,
          albumType: mapDeezerRecordType(album.record_type),
          releaseDate: album.release_date,
          coverUrl: album.cover_medium ?? album.cover ?? null,
          spotifyUrl: undefined,
        }),
      );
    } catch {
      return [];
    }
  }

  private async searchTracks(
    query: string,
    limit: number,
    firstArtist: DeezerArtist | undefined,
  ): Promise<NormalizedTrack[]> {
    try {
      // Bug 4: if the first artist result fuzzy-matches the query, use the dedicated
      // /artist/{id}/top endpoint which ranks by play count and returns the artist's
      // own tracks — avoids unrelated featuring tracks that generic /search/track returns.
      // The first artist is fetched once in searchCatalog and passed in to avoid a
      // duplicate /search/artist call.
      let rawTracks: DeezerTrack[];
      if (firstArtist && namesMatch(firstArtist.name, query)) {
        rawTracks = await this.deezerClient.getArtistTopTracks(firstArtist.id, limit);
      } else {
        const allTracks = await this.deezerClient.searchTrack(query);
        rawTracks = allTracks.slice(0, limit);
      }

      return rawTracks.map(
        (track): NormalizedTrack => ({
          name: track.title,
          artist: track.artist.name,
          artists: [{ name: track.artist.name, url: undefined }],
          // Deezer-opaque URL — not a Spotify URL, will be lazy-resolved by ExternalUrlResolver
          trackUrl: `https://api.deezer.com/track/${track.id}`,
          albumId: track.album?.id ? String(track.album.id) : undefined,
          albumCoverUrl: track.album?.cover_medium ?? track.album?.cover ?? undefined,
          // Bug 2: Deezer returns duration in seconds; NormalizedTrack expects milliseconds
          durationMs: track.duration * 1000,
        }),
      );
    } catch {
      return [];
    }
  }
}

/**
 * Maps a Deezer record_type string to the shared AlbumType enum.
 * Deezer uses "compile" for compilations; we normalize to "compilation".
 */
function mapDeezerRecordType(recordType?: string): AlbumType | undefined {
  switch (recordType) {
    case "album":
      return "album";
    case "single":
      return "single";
    case "ep":
      return "ep";
    case "compile":
      return "compilation";
    default:
      return undefined;
  }
}
