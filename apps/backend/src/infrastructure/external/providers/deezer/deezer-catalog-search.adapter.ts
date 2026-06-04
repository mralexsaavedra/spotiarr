import type { AlbumType, ArtistRelease, FollowedArtist, NormalizedTrack } from "@spotiarr/shared";
import type {
  CatalogSearchPort,
  CatalogSearchResult,
} from "@/application/ports/catalog-search.port";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import { namesMatch } from "../normalize-name";
import type { DeezerArtist, DeezerClient, DeezerTrack } from "./deezer.client";
import { pickBestDeezerArtistPicture, upscaleDeezerImage } from "./picture";

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
        const freshImage = pickBestDeezerArtistPicture(deezerArtist);
        const cached = await this.feedRepository.getArtistByAnyId(String(deezerArtist.id));
        if (cached) {
          return { ...cached, image: freshImage ?? upscaleDeezerImage(cached.image) };
        }
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
      // Artist name match → /artist/{id}/top returns the artist's own tracks
      // ranked by plays; generic /search/track ranks globally and surfaces features.
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
          primaryArtist: track.artist.id ? String(track.artist.id) : undefined,
          trackUrl: `https://api.deezer.com/track/${track.id}`,
          albumId: track.album?.id ? String(track.album.id) : undefined,
          albumCoverUrl: track.album?.cover_medium ?? track.album?.cover ?? undefined,
          // Deezer returns seconds; NormalizedTrack expects milliseconds.
          durationMs: track.duration * 1000,
        }),
      );
    } catch {
      return [];
    }
  }
}

function mapDeezerRecordType(recordType?: string): AlbumType | undefined {
  // Deezer emits "compile"; the shared enum uses "compilation".
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
