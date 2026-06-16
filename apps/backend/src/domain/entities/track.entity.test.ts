import { TrackStatusEnum, type ITrack } from "@spotiarr/shared";
import { describe, expect, it } from "vitest";
import { Track } from "./track.entity";

function makeTrack(overrides: Partial<ITrack> = {}): ITrack {
  return {
    id: "track-1",
    name: "Song",
    artist: "Artist",
    status: TrackStatusEnum.New,
    ...overrides,
  };
}

// T3.2 — R4 + R9: Track.isTerminalError() domain method
describe("Track.isTerminalError()", () => {
  it("returns true when error is youtube_not_found", () => {
    const track = new Track(makeTrack({ error: "youtube_not_found" }));
    expect(track.isTerminalError()).toBe(true);
  });

  it("returns false for a retryable error message", () => {
    const track = new Track(makeTrack({ error: "network_error" }));
    expect(track.isTerminalError()).toBe(false);
  });

  it("returns false for an arbitrary exception message", () => {
    const track = new Track(makeTrack({ error: "yt-dlp crashed unexpectedly" }));
    expect(track.isTerminalError()).toBe(false);
  });

  it("returns false when error is undefined", () => {
    const track = new Track(makeTrack({ error: undefined }));
    expect(track.isTerminalError()).toBe(false);
  });

  it("returns false when error is null/empty string", () => {
    const track = new Track(makeTrack({ error: "" }));
    expect(track.isTerminalError()).toBe(false);
  });
});

// T3.2 — searchAttempts getter
describe("Track.searchAttempts", () => {
  it("defaults to 0 when not set", () => {
    const track = new Track(makeTrack());
    expect(track.searchAttempts).toBe(0);
  });

  it("exposes the value passed in props", () => {
    const track = new Track(makeTrack({ searchAttempts: 3 }));
    expect(track.searchAttempts).toBe(3);
  });
});
