const DEEZER_CDN_HOST = "cdns-images.dzcdn.net";
const DEEZER_API_IMAGE = /^https?:\/\/api\.deezer\.com\/album\/\d+\/image\b/;
const DEEZER_SIZE_SEGMENT = /\/\d+x\d+-/;

export function upgradeDeezerCoverUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  if (DEEZER_API_IMAGE.test(url)) {
    const [base, query = ""] = url.split("?");
    const params = new URLSearchParams(query);
    params.set("size", "xl");
    return `${base}?${params.toString()}`;
  }

  if (url.includes(DEEZER_CDN_HOST)) {
    return url.replace(DEEZER_SIZE_SEGMENT, "/1000x1000-");
  }

  return url;
}
