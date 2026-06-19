import type { TopArtistItem, TopTrackItem } from "@spotiarr/shared";
import type { ListeningScope } from "@spotiarr/shared";

const CAP = 15;
// Guard against unbounded user-supplied text being injected verbatim into the LLM prompt.
const NAME_MAX = 100;

const trunc = (s: string) => s.slice(0, NAME_MAX);

/**
 * Pure formatter: given top tracks, top artists, and a scope, produces
 * a compact string fragment suitable for appending to an AI prompt.
 *
 * Returns an empty string when there is nothing to include (arrays empty
 * after filtering by scope), so callers can treat "" as "no context".
 */
export function buildListeningContext(
  topTracks: TopTrackItem[],
  topArtists: TopArtistItem[],
  scope: ListeningScope,
): string {
  const parts: string[] = [];

  if (scope === "tracks" || scope === "both") {
    const tracks = topTracks.slice(0, CAP);
    if (tracks.length > 0) {
      const list = tracks.map((t) => `${trunc(t.trackName)} — ${trunc(t.artist)}`).join(", ");
      parts.push(`User's most listened tracks: ${list}`);
    }
  }

  if (scope === "artists" || scope === "both") {
    const artists = topArtists.slice(0, CAP);
    if (artists.length > 0) {
      const list = artists.map((a) => trunc(a.artist)).join(", ");
      parts.push(`User's most listened artists: ${list}`);
    }
  }

  return parts.join("\n");
}
