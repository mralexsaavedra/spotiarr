import { ApiErrorCode } from "@spotiarr/shared";

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

export const mapSpotifyError = (error: unknown, fallback: ApiErrorCode): ApiErrorCode | null => {
  if (!(error instanceof Error)) return null;

  if (error.message === "missing_user_access_token") {
    return "missing_user_access_token";
  }

  if (error.message === "spotify_rate_limited") {
    return "spotify_rate_limited";
  }

  return fallback;
};

export const getSpotifyIdFromUrl = (url: string): string | null => {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split("/");
    // path is usually /artist/<id> or /album/<id> or /track/<id>
    // parts[0] is empty, parts[1] is type, parts[2] is id
    if (parts.length >= 3) {
      return parts[2];
    }
    return null;
  } catch {
    return null;
  }
};
