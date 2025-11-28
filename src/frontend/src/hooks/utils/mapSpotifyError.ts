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
