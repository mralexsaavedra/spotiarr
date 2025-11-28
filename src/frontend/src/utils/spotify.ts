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

export type SpotifyBaseError = "missing_user_access_token" | "spotify_rate_limited";

export const mapSpotifyError = <T extends string>(
  error: unknown,
  fallback: T,
): SpotifyBaseError | T | null => {
  if (!(error instanceof Error)) return null;

  if (error.message === "missing_user_access_token") {
    return "missing_user_access_token";
  }

  if (error.message === "spotify_rate_limited") {
    return "spotify_rate_limited";
  }

  return fallback;
};
