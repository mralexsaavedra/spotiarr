/**
 * Returns true when a play qualifies to be recorded.
 * Condition A: elapsed time exceeds 30 seconds (strict >)
 * Condition B: elapsed time exceeds 50% of known duration (strict >)
 *
 * When duration is unknown (null, undefined, <= 0), only Condition A applies.
 */
export function shouldRecordPlay(
  currentTime: number,
  duration: number | null | undefined,
): boolean {
  if (currentTime > 30) return true;
  if (duration != null && duration > 0 && currentTime / duration > 0.5) return true;
  return false;
}
