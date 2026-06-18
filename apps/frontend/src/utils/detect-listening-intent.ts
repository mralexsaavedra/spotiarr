import type { ListeningIntent } from "@spotiarr/shared";

/**
 * Pure helper that analyses a user prompt for listening-history intent.
 * Returns { scope: 'tracks' | 'artists' | 'both' | null }.
 *
 * Detection rules (case-insensitive, bilingual EN/ES):
 * - If a "top / most listened / más escuchad@" signal is present AND a track noun
 *   (song/songs/track/tracks/canción/canciones/tema/temas) is near → scope: 'tracks'
 * - If a "top / most listened / más escuchad@" signal is present AND an artist noun
 *   (artist/artists/band/bands/grupo/grupos/artista/artistas) is near → scope: 'artists'
 * - If a "top / most listened" signal is present with NO specific noun → scope: 'both'
 * - Otherwise → scope: null
 */
export function detectListeningIntent(prompt: string): ListeningIntent {
  const lower = prompt.toLowerCase();

  // Phrases that signal "top / most listened" in EN and ES
  const topSignal =
    /\b(top|most[- ]listened|most[- ]played|favorite|favourites?|most)\b|m[aá]s escuchad[oa]s?|lo que m[aá]s escucho/i;

  if (!topSignal.test(lower)) {
    return { scope: null };
  }

  // Track nouns (EN + ES)
  const trackNoun = /\b(songs?|tracks?|canciones?|temas?)\b/i;

  // Artist nouns (EN + ES)
  const artistNoun = /\b(artists?|bands?|grupos?|artistas?)\b/i;

  const hasTrackNoun = trackNoun.test(lower);
  const hasArtistNoun = artistNoun.test(lower);

  if (hasTrackNoun && !hasArtistNoun) return { scope: "tracks" };
  if (hasArtistNoun && !hasTrackNoun) return { scope: "artists" };
  if (hasTrackNoun && hasArtistNoun) return { scope: "both" };

  // Signal present but no specific noun → both
  return { scope: "both" };
}
