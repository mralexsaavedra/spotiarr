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

// T3.2 — optional getters
describe("Track optional getters", () => {
  it("youtubeUrl returns undefined when not set", () => {
    const track = new Track(makeTrack());
    expect(track.youtubeUrl).toBeUndefined();
  });

  it("youtubeUrl returns value when set", () => {
    const track = new Track(makeTrack({ youtubeUrl: "https://youtu.be/abc" }));
    expect(track.youtubeUrl).toBe("https://youtu.be/abc");
  });

  it("trackUrl returns undefined when not set", () => {
    const track = new Track(makeTrack());
    expect(track.trackUrl).toBeUndefined();
  });

  it("trackUrl returns value when set", () => {
    const track = new Track(makeTrack({ trackUrl: "/music/track.mp3" }));
    expect(track.trackUrl).toBe("/music/track.mp3");
  });
});

// T3.2 — state-transition methods
describe("Track.markAsDownloading()", () => {
  it("sets status to Downloading when coming from New", () => {
    const track = new Track(makeTrack({ status: TrackStatusEnum.New }));
    track.markAsDownloading();
    expect(track.status).toBe(TrackStatusEnum.Downloading);
  });

  it("sets status to Downloading even when status is already Completed (no guard throw)", () => {
    const track = new Track(makeTrack({ status: TrackStatusEnum.Completed }));
    track.markAsDownloading();
    expect(track.status).toBe(TrackStatusEnum.Downloading);
  });
});

describe("Track.markAsQueued()", () => {
  it("sets youtubeUrl, status to Queued, and resets searchAttempts to 0", () => {
    const track = new Track(makeTrack({ searchAttempts: 5 }));
    track.markAsQueued("https://youtu.be/xyz");
    expect(track.youtubeUrl).toBe("https://youtu.be/xyz");
    expect(track.status).toBe(TrackStatusEnum.Queued);
    expect(track.searchAttempts).toBe(0);
  });
});

describe("Track.markAsSearching()", () => {
  it("sets status to Searching and increments searchAttempts from 0", () => {
    const track = new Track(makeTrack());
    track.markAsSearching();
    expect(track.status).toBe(TrackStatusEnum.Searching);
    expect(track.searchAttempts).toBe(1);
  });

  it("increments searchAttempts on repeated calls", () => {
    const track = new Track(makeTrack({ searchAttempts: 2 }));
    track.markAsSearching();
    expect(track.searchAttempts).toBe(3);
  });
});

describe("Track.markAsNew()", () => {
  it("sets status to New and clears error", () => {
    const track = new Track(makeTrack({ status: TrackStatusEnum.Error, error: "some_error" }));
    track.markAsNew();
    expect(track.status).toBe(TrackStatusEnum.New);
    expect(track.toPrimitive().error).toBeUndefined();
  });
});

describe("Track.markAsError()", () => {
  it("sets status to Error and records the error code", () => {
    const track = new Track(makeTrack());
    track.markAsError("youtube_not_found");
    expect(track.status).toBe(TrackStatusEnum.Error);
    expect(track.toPrimitive().error).toBe("youtube_not_found");
  });
});

describe("Track.setDurationMs()", () => {
  it("stores the duration in props", () => {
    const track = new Track(makeTrack());
    track.setDurationMs(180000);
    expect(track.toPrimitive().durationMs).toBe(180000);
  });
});
