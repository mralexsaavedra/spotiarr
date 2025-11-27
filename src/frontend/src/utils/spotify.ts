export const normalizeSpotifyUrl = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);

    if (!url.hostname.endsWith("spotify.com")) return null;

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 2) return null;

    const allowedTypes = new Set(["playlist", "album", "track", "artist"]);

    for (let i = 0; i < segments.length - 1; i += 1) {
      const type = segments[i];
      const id = segments[i + 1];
      if (allowedTypes.has(type) && Boolean(id)) {
        const normalizedPath = `/${type}/${id}`;
        return `${url.origin}${normalizedPath}`;
      }
    }

    return null;
  } catch {
    return null;
  }
};
