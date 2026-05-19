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
const DEEZER_CDN_HOST = "cdns-images.dzcdn.net";
const DEEZER_API_IMAGE = /^https?:\/\/api\.deezer\.com\/album\/\d+\/image\b/;
const DEEZER_SIZE_SEGMENT = /\/\d+x\d+-/;

export function upgradeDeezerCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Rewrite api.deezer.com/album/{id}/image (default 120x120 redirect) → ?size=xl.
  if (DEEZER_API_IMAGE.test(url)) {
    const [base, query = ""] = url.split("?");
    const params = new URLSearchParams(query);
    params.set("size", "xl");
    return `${base}?${params.toString()}`;
  }

  // Rewrite direct CDN URLs to the 1000x1000 size segment.
  if (url.includes(DEEZER_CDN_HOST)) {
    return url.replace(DEEZER_SIZE_SEGMENT, "/1000x1000-");
  }

  return url;
}
