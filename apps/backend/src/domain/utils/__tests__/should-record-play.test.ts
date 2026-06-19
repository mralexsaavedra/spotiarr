import { describe, expect, it } from "vitest";
import { shouldRecordPlay } from "../should-record-play";

describe("shouldRecordPlay(currentTime, durationMs)", () => {
  describe("Condition A — 30-second absolute threshold", () => {
    it("returns false when elapsed is exactly 30s", () => {
      expect(shouldRecordPlay(30, 180_000)).toBe(false);
    });

    it("returns true when elapsed just exceeds 30s", () => {
      expect(shouldRecordPlay(30.001, 180_000)).toBe(true);
    });

    it("returns false when elapsed is well below 30s", () => {
      expect(shouldRecordPlay(25, 180_000)).toBe(false);
    });

    it("returns true when elapsed is well above 30s", () => {
      expect(shouldRecordPlay(90, 180_000)).toBe(true);
    });
  });

  describe("Condition B — 50% relative threshold", () => {
    it("returns true when elapsed exceeds 50% of a 40-second track", () => {
      // 20s / 40s = 50% exactly → NOT enough (condition B is strictly > 50%)
      // 20.001s / 40s > 50% → should record
      expect(shouldRecordPlay(20.001, 40_000)).toBe(true);
    });

    it("returns false when elapsed is exactly 50% of a 40-second track", () => {
      // 20s / 40s = 0.5 — not strictly greater than 0.5
      expect(shouldRecordPlay(20, 40_000)).toBe(false);
    });

    it("returns false when elapsed is just under 50% and under 30s", () => {
      expect(shouldRecordPlay(19.999, 40_000)).toBe(false);
    });

    it("returns true for a short track where 50% is reached before 30s", () => {
      // 40s track, 20.001s elapsed → Condition B fires (30s not yet crossed)
      expect(shouldRecordPlay(20.001, 40_000)).toBe(true);
    });
  });

  describe("durationMs = 0 (unknown duration — only Condition A applies)", () => {
    it("returns false at 30s when duration is 0", () => {
      expect(shouldRecordPlay(30, 0)).toBe(false);
    });

    it("returns true when elapsed exceeds 30s and duration is 0", () => {
      expect(shouldRecordPlay(30.001, 0)).toBe(true);
    });

    it("returns false when elapsed is below 30s and duration is 0", () => {
      expect(shouldRecordPlay(25, 0)).toBe(false);
    });
  });

  describe("durationMs = null (unknown duration — only Condition A applies)", () => {
    it("returns false at 30s when duration is null", () => {
      expect(shouldRecordPlay(30, null)).toBe(false);
    });

    it("returns true when elapsed exceeds 30s and duration is null", () => {
      expect(shouldRecordPlay(30.001, null)).toBe(true);
    });

    it("returns false when elapsed is below 30s and duration is null", () => {
      expect(shouldRecordPlay(25, null)).toBe(false);
    });
  });

  describe("OR logic — at least one condition must be true", () => {
    it("returns true if only Condition A is met (short track, 30s+ elapsed)", () => {
      // 200s track at 31s → Condition A: 31 > 30 ✓, Condition B: 31/200 < 0.5 ✗
      expect(shouldRecordPlay(31, 200_000)).toBe(true);
    });

    it("returns true if only Condition B is met (short track, under 30s)", () => {
      // 40s track at 20.001s → Condition A: 20.001 ≤ 30 ✗, Condition B: > 50% ✓
      expect(shouldRecordPlay(20.001, 40_000)).toBe(true);
    });

    it("returns true when both conditions are met", () => {
      // 40s track at 31s → both conditions met
      expect(shouldRecordPlay(31, 40_000)).toBe(true);
    });
  });
});
