import type { AlbumType, ArtistRelease } from "@spotiarr/shared";
import { namesMatch } from "../normalize-name";

export interface DeezerArtist {
  id: number;
  name: string;
  picture?: string;
}

export interface DeezerAlbum {
  id: number;
  title: string;
  cover?: string;
  release_date?: string;
  type?: string;
  link?: string;
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
        const t = album.type?.toLowerCase();
        return t === "album" || t === "single" || t === "ep";
      })
      .map((album) => ({
        artistId: String(deezerId),
        artistName: "", // filled in by orchestration layer
        artistImageUrl: null,
        albumId: String(album.id),
        albumName: album.title,
        albumType: mapDeezerType(album.type),
        releaseDate: album.release_date,
        coverUrl: album.cover ?? null,
        spotifyUrl: undefined,
      }));
  }
}

function mapDeezerType(type?: string): AlbumType | undefined {
  const t = type?.toLowerCase();
  if (t === "album" || t === "ep") return "album";
  if (t === "single") return "single";
  return undefined;
}
