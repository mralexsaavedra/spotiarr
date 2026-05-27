import { upgradeDeezerCoverUrl } from "@/domain/utils/deezer-cover-url";

/**
 * Deezer cover URLs are deterministic and encode the requested size in the path:
 *   https://cdns-images.dzcdn.net/images/cover/{hash}/{w}x{h}-...jpg
 *
 * Sizes returned by the API:
 *   cover         → 120x120
 *   cover_medium  → 250x250
 *   cover_big     → 500x500
 *   cover_xl      → 1000x1000
 *
 * Rewriting the size segment lets us upgrade previously cached low-res URLs
 * to high-res in place, without refetching from the provider.
 */
/**
 * Returns the best available cover URL from a Deezer album object,
 * preferring the highest resolution available.
 */
export function pickBestCover(album: {
  cover_xl?: string;
  cover_big?: string;
  cover_medium?: string;
  cover?: string;
}): string | undefined {
  return album.cover_xl || album.cover_big || album.cover_medium || album.cover || undefined;
}

export { upgradeDeezerCoverUrl };
