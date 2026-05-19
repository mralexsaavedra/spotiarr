import { AppError } from "@/domain/errors/app-error";

export const ARTIST_DISCOGRAPHY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Maximum time the interactive artist-view path waits for the full provider
 * chain (Deezer → MusicBrainz → Spotify) before falling back to cached DB
 * albums. DB reads are unbounded by this timeout.
 */
export const INTERACTIVE_CATALOG_TIMEOUT_MS = 500;

/**
 * Returns true when the artist album cache is still within the TTL window.
 */
export function isArtistCacheFresh(syncedAt: Date | null): boolean {
  if (!syncedAt) return false;
  return Date.now() - syncedAt.getTime() <= ARTIST_DISCOGRAPHY_TTL_MS;
}

/**
 * Races a promise against a timeout. Rejects with AppError(504) on timeout.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AppError(504, "interactive_timeout", "Interactive catalog timeout"));
    }, ms);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (reason) => {
        clearTimeout(timer);
        reject(reason);
      },
    );
  });
}
