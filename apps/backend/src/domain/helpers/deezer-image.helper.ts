export function upscaleDeezerImage(url: string | null | undefined): string | null {
  if (!url) return null;
  return url.replace(/\/\d+x\d+(-[^/]+)?\.jpg$/, "/1000x1000$1.jpg");
}
