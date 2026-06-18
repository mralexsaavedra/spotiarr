import { describe, expect, it } from "vitest";
import { shouldRecordPlay } from "./should-record-play";

describe("shouldRecordPlay", () => {
  // --- 30-second boundary ---
  it("returns false at exactly 30s (strict >)", () => {
    expect(shouldRecordPlay(30, 180)).toBe(false);
  });

  it("returns true at 30.001s (crosses 30s threshold)", () => {
    expect(shouldRecordPlay(30.001, 180)).toBe(true);
  });

  it("returns false at 29.999s", () => {
    expect(shouldRecordPlay(29.999, 180)).toBe(false);
  });

  // --- 50% boundary ---
  it("returns true at exactly 50% of a 40s track (20s — strict >)", () => {
    // 20s is NOT > 50% of 40s (20/40 = 0.5, not > 0.5)
    expect(shouldRecordPlay(20, 40)).toBe(false);
  });

  it("returns true just past 50% of a 40s track (20.001s)", () => {
    expect(shouldRecordPlay(20.001, 40)).toBe(true);
  });

  it("returns true at 19.999s of a 39s track (> 50%)", () => {
    // 19.999 / 38 < 0.5 → false; 19.999 / 38.999 is ~0.5128 > 0.5 → true
    expect(shouldRecordPlay(20, 39)).toBe(true);
  });

  // 50% fires before 30s for a short track
  it("returns true for a 40s track when 21s elapsed (> 50%, < 30s)", () => {
    expect(shouldRecordPlay(21, 40)).toBe(true);
  });

  // --- Unknown / zero duration — only 30s rule applies ---
  it("returns false at 25s when durationMs is 0", () => {
    expect(shouldRecordPlay(25, 0)).toBe(false);
  });

  it("returns true at 31s when durationMs is 0", () => {
    expect(shouldRecordPlay(31, 0)).toBe(true);
  });

  it("returns false at 25s when durationMs is null", () => {
    expect(shouldRecordPlay(25, null)).toBe(false);
  });

  it("returns true at 31s when durationMs is null", () => {
    expect(shouldRecordPlay(31, null)).toBe(true);
  });

  it("returns false at 25s when durationMs is undefined", () => {
    expect(shouldRecordPlay(25, undefined)).toBe(false);
  });

  it("returns true at 31s when durationMs is undefined", () => {
    expect(shouldRecordPlay(31, undefined)).toBe(true);
  });

  // --- Edge: negative duration treated as unknown ---
  it("returns false at 25s when duration is negative (only 30s rule)", () => {
    expect(shouldRecordPlay(25, -1)).toBe(false);
  });

  it("returns true at 31s when duration is negative", () => {
    expect(shouldRecordPlay(31, -1)).toBe(true);
  });
});
