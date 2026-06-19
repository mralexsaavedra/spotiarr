/**
 * Determines whether a play event qualifies for recording.
 *
 * A play qualifies if AT LEAST ONE condition is true:
 *   A) elapsed time strictly exceeds 30 seconds
 *   B) elapsed time strictly exceeds 50% of the known duration
 *
 * When durationMs is 0 or null (unknown), only Condition A is applied.
 *
 * @param currentTimeSeconds - elapsed playback time in seconds
 * @param durationMs - track duration in milliseconds, or null/0 when unknown
 */
export function shouldRecordPlay(currentTimeSeconds: number, durationMs: number | null): boolean {
  const conditionA = currentTimeSeconds > 30;

  if (!durationMs || durationMs <= 0) {
    return conditionA;
  }

  const durationSeconds = durationMs / 1000;
  const conditionB = durationSeconds > 0 && currentTimeSeconds / durationSeconds > 0.5;

  return conditionA || conditionB;
}
