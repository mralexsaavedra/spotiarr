import type { AlbumType, ArtistRelease, FollowedArtist, NormalizedTrack } from "@spotiarr/shared";
import type {
  CatalogSearchPort,
  CatalogSearchResult,
} from "@/application/ports/catalog-search.port";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import { namesMatch } from "../normalize-name";
import type { DeezerClient, DeezerTrack } from "./deezer.client";

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
    const [artists, albums, tracks] = await Promise.all([
      types.includes("artist")
        ? this.searchArtists(query, limits.artist ?? 5)
        : Promise.resolve<FollowedArtist[]>([]),
      types.includes("album")
        ? this.searchAlbums(query, limits.album ?? 10)
        : Promise.resolve<ArtistRelease[]>([]),
      types.includes("track")
        ? this.searchTracks(query, limits.track ?? 10)
        : Promise.resolve<NormalizedTrack[]>([]),
    ]);

    return { tracks, albums, artists };
  }

  private async searchArtists(query: string, limit: number): Promise<FollowedArtist[]> {
    try {
      const deezerArtists = await this.deezerClient.searchArtistList(query, limit);

      const resolved = await Promise.all(
        deezerArtists.map(async (deezerArtist): Promise<FollowedArtist> => {
          // Look up the cache by Deezer ID to resolve to the Spotify ID
          const cached = await this.feedRepository.getArtistByAnyId(String(deezerArtist.id));
          if (cached) {
            return cached;
          }
          // Artist not in cache — surface the Deezer ID as the identifier
          return {
            id: String(deezerArtist.id),
            name: deezerArtist.name,
            image:
              deezerArtist.picture_xl ??
              deezerArtist.picture_big ??
              deezerArtist.picture_medium ??
              deezerArtist.picture ??
              null,
            spotifyUrl: null,
          };
        }),
      );

      return resolved;
    } catch {
      return [];
    }
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

  private async searchTracks(query: string, limit: number): Promise<NormalizedTrack[]> {
    try {
      // Bug 4: if the first artist result fuzzy-matches the query, use the dedicated
      // /artist/{id}/top endpoint which ranks by play count and returns the artist's
      // own tracks — avoids unrelated featuring tracks that generic /search/track returns.
      const artistResults = await this.deezerClient.searchArtistList(query, 1);
      const firstArtist = artistResults[0];

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
