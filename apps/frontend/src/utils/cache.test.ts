import { describe, expect, it } from "vitest";
import {
  buildStaleWhileRevalidateTimings,
  getCacheMinutesFromSettings,
  getSettingsCacheTimings,
  STALE_TIME_AUTH,
  STALE_TIME_LONG,
  STALE_TIME_MEDIUM,
} from "./cache";

describe("getCacheMinutesFromSettings", () => {
  it("returns fallback when key is missing", () => {
    const settings = [{ key: "other", value: "10" }];
    expect(getCacheMinutesFromSettings(settings, "RELEASES_CACHE_MINUTES", 5)).toBe(5);
  });

  it("parses a valid setting value", () => {
    const settings = [{ key: "RELEASES_CACHE_MINUTES", value: "60" }];
    expect(getCacheMinutesFromSettings(settings, "RELEASES_CACHE_MINUTES", 5)).toBe(60);
  });

  it("returns fallback when value is not a number", () => {
    const settings = [{ key: "RELEASES_CACHE_MINUTES", value: "invalid" }];
    expect(getCacheMinutesFromSettings(settings, "RELEASES_CACHE_MINUTES", 5)).toBe(5);
  });
});

describe("buildStaleWhileRevalidateTimings", () => {
  it("calculates gcTime and staleTime from cache minutes", () => {
    const result = buildStaleWhileRevalidateTimings(10);
    expect(result.gcTime).toBe(10 * 60 * 1000);
    expect(result.staleTime).toBe(5 * 60 * 1000);
  });

  it("enforces a minimum staleTime of one minute", () => {
    const result = buildStaleWhileRevalidateTimings(1);
    expect(result.gcTime).toBe(60 * 1000);
    expect(result.staleTime).toBe(60 * 1000);
  });
});

describe("getSettingsCacheTimings", () => {
  it("combines parsing and timing building", () => {
    const settings = [{ key: "RELEASES_CACHE_MINUTES", value: "20" }];
    const result = getSettingsCacheTimings(settings, "RELEASES_CACHE_MINUTES", 5);
    expect(result.gcTime).toBe(20 * 60 * 1000);
    expect(result.staleTime).toBe(10 * 60 * 1000);
  });
});

describe("cache constants", () => {
  it("exports expected constant values", () => {
    expect(STALE_TIME_LONG).toBe(5 * 60 * 1000);
    expect(STALE_TIME_MEDIUM).toBe(60 * 1000);
    expect(STALE_TIME_AUTH).toBe(30 * 1000);
  });
});
