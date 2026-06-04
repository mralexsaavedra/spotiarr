import type { AlbumType, ArtistRelease, NormalizedTrack } from "@spotiarr/shared";
import { namesMatch } from "../normalize-name";
import { pickBestCover } from "./cover-url";

export interface DeezerArtist {
  id: number;
  name: string;
  picture?: string;
}

export interface DeezerAlbum {
  id: number;
  title: string;
  cover?: string;
  cover_small?: string;
  cover_medium?: string;
  cover_big?: string;
  cover_xl?: string;
  release_date?: string;
  type?: string;
  record_type?: string;
  link?: string;
}

export interface DeezerTrack {
  id: number;
  title: string;
  duration: number;
  track_position: number;
  disk_number: number;
  artist: {
    name: string;
    id?: number;
  };
  album?: {
    title: string;
    cover?: string;
    cover_xl?: string;
    cover_big?: string;
    cover_medium?: string;
  };
}

const DEEZER_API_BASE = "https://api.deezer.com";

/**
 * Deezer REST client for artist search and album lookup.
 * Deezer's public API does not require authentication and allows
 * roughly 10 requests per second.
 */
export class DeezerClient {
  private lastRequestAt = 0;
  private readonly minIntervalMs: number;

  constructor(minIntervalMs = 120) {
    this.minIntervalMs = minIntervalMs;
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async fetchJson<T>(url: string): Promise<T | null> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < this.minIntervalMs) {
      await this.sleep(this.minIntervalMs - elapsed);
    }
    this.lastRequestAt = Date.now();

    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`[DeezerClient] ${response.status} for ${url}`);
        return null;
      }
      return (await response.json()) as T;
    } catch (err) {
      console.warn(`[DeezerClient] Network error for ${url}:`, err);
      return null;
    }
  }

  /**
   * Search for an artist by name and return the first exact match.
   */
  async searchArtist(name: string): Promise<DeezerArtist | null> {
    const encoded = encodeURIComponent(name);
    const result = await this.fetchJson<{ data: DeezerArtist[] }>(
      `${DEEZER_API_BASE}/search/artist?q=${encoded}`,
    );

    if (!result?.data?.length) {
      return null;
    }

    const match = result.data.find((a) => namesMatch(a.name, name));
    if (!match) {
      return null;
    }

    return match;
  }

  /**
   * Search for artists by name and return multiple matches up to limit.
   * Unlike searchArtist, this does not filter to an exact name match —
   * it returns all results up to `limit` so the caller can apply its own ranking.
   */
  async searchArtistList(name: string, limit: number): Promise<DeezerArtist[]> {
    const encoded = encodeURIComponent(name);
    const result = await this.fetchJson<{ data: DeezerArtist[] }>(
      `${DEEZER_API_BASE}/search/artist?q=${encoded}&limit=${limit}`,
    );
    return result?.data?.slice(0, limit) ?? [];
  }

  /**
   * Search for albums by query and return multiple matches up to limit.
   */
  async searchAlbumList(
    query: string,
    limit: number,
  ): Promise<(DeezerAlbum & { artist?: { id: number; name: string } })[]> {
    const encoded = encodeURIComponent(query);
    const result = await this.fetchJson<{
      data: (DeezerAlbum & { artist?: { id: number; name: string } })[];
    }>(`${DEEZER_API_BASE}/search/album?q=${encoded}&limit=${limit}`);
    return result?.data?.slice(0, limit) ?? [];
  }

  /**
   * Fetch albums for a given Deezer artist ID.
   * Deezer returns albums, singles, and compilations under the same endpoint.
   * We map album + single types to ArtistRelease.
   *
   * Follows Deezer pagination automatically to return the full discography.
   */
  async getArtistAlbums(deezerId: string | number): Promise<ArtistRelease[]> {
    const allAlbums: DeezerAlbum[] = [];
    let url: string | null = `${DEEZER_API_BASE}/artist/${deezerId}/albums?limit=100`;

    while (url) {
      const result: {
        data?: DeezerAlbum[];
        next?: string | null;
      } | null = await this.fetchJson(url);

      if (!result?.data) {
        break;
      }

      allAlbums.push(...result.data);
      url = result.next ?? null;
    }

    return allAlbums
      .filter((album) => {
        const t = getDeezerReleaseType(album)?.toLowerCase();
        return t === "album" || t === "single" || t === "ep";
      })
      .map((album) => ({
        artistId: String(deezerId),
        artistName: "", // filled in by orchestration layer
        artistImageUrl: null,
        albumId: String(album.id),
        albumName: album.title,
        albumType: mapDeezerType(getDeezerReleaseType(album)),
        releaseDate: album.release_date,
        coverUrl: pickBestCover(album) ?? null,
        spotifyUrl: undefined,
      }));
  }

  /**
   * Fetch an artist directly by their Deezer numeric ID.
   * Returns null on any error or non-OK response.
   */
  async getArtistById(deezerId: string | number): Promise<DeezerArtist | null> {
    const result = await this.fetchJson<DeezerArtist>(`${DEEZER_API_BASE}/artist/${deezerId}`);
    if (!result?.id) return null;
    return result;
  }

  /**
   * Search for an album by artist name + album name and return the first exact match.
   */
  async searchAlbum(artistName: string, albumName: string): Promise<DeezerAlbum | null> {
    const encoded = encodeURIComponent(`${artistName} ${albumName}`);
    const result = await this.fetchJson<{ data: DeezerAlbum[] }>(
      `${DEEZER_API_BASE}/search/album?q=${encoded}`,
    );

    if (!result?.data?.length) {
      return null;
    }

    const match = result.data.find((a) => namesMatch(a.title, albumName));
    if (!match) {
      return null;
    }

    return match;
  }

  /**
   * Fetch tracks for a given Deezer album ID and normalize them.
   * Follows Deezer pagination automatically.
   *
   * Also fetches /album/:id once to backfill the album title and the
   * highest-resolution cover, since /album/:id/tracks omits this metadata.
   */
  async getAlbumTracks(deezerAlbumId: string | number): Promise<NormalizedTrack[]> {
    const albumMeta = await this.fetchJson<DeezerAlbum>(
      `${DEEZER_API_BASE}/album/${deezerAlbumId}`,
    );
    const albumTitle = albumMeta?.title ?? "";
    const albumCover = albumMeta ? pickBestCover(albumMeta) : undefined;

    const allTracks: DeezerTrack[] = [];
    let url: string | null = `${DEEZER_API_BASE}/album/${deezerAlbumId}/tracks?limit=100`;

    while (url) {
      const result: {
        data?: DeezerTrack[];
        next?: string | null;
      } | null = await this.fetchJson(url);

      if (!result?.data) {
        break;
      }

      allTracks.push(...result.data);
      url = result.next ?? null;
    }

    return allTracks.map((track) => ({
      name: track.title,
      artist: track.artist?.name ?? "",
      artists: track.artist?.name ? [{ name: track.artist.name, url: undefined }] : [],
      album: track.album?.title ?? albumTitle,
      trackNumber: track.track_position,
      discNumber: track.disk_number,
      durationMs: track.duration * 1000,
      trackUrl: `${DEEZER_API_BASE}/track/${track.id}`,
      albumUrl: `${DEEZER_API_BASE}/album/${deezerAlbumId}`,
      albumCoverUrl: (track.album && pickBestCover(track.album)) ?? albumCover,
    }));
  }
}

function getDeezerReleaseType(album: DeezerAlbum): string | undefined {
  return album.record_type ?? album.type;
}

function mapDeezerType(type?: string): AlbumType | undefined {
  const t = type?.toLowerCase();
  if (t === "album" || t === "single" || t === "ep") return t;
  return undefined;
}
