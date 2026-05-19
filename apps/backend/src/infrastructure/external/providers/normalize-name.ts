/**
 * Normalize an artist name for deterministic comparison across providers.
 * Lowercases, trims, and collapses whitespace.
 */
export function normalizeArtistName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Check whether two artist names match after normalization.
 * Uses strict exact match; loosening requires evidence.
 */
export function namesMatch(a: string, b: string): boolean {
  return normalizeArtistName(a) === normalizeArtistName(b);
}
