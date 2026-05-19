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
const DEEZER_COVER_HOST = "cdns-images.dzcdn.net";
const DEEZER_SIZE_SEGMENT = /\/\d+x\d+-/;

export function upgradeDeezerCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (!url.includes(DEEZER_COVER_HOST)) return url;
  return url.replace(DEEZER_SIZE_SEGMENT, "/1000x1000-");
}
