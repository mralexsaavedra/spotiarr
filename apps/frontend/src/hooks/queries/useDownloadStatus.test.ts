import { PlaylistStatusEnum, TrackStatusEnum } from "@spotiarr/shared";
import type { DownloadStatusResponse } from "@spotiarr/shared";
import { describe, expect, it } from "vitest";
import { deriveIsDownloaded, deriveIsDownloading } from "./useDownloadStatus";

const emptyData: DownloadStatusResponse = {
  playlistStatusMap: {},
  trackStatusMap: {},
  albumTrackCountMap: {},
};

const data: DownloadStatusResponse = {
  playlistStatusMap: {
    "https://open.spotify.com/playlist/abc": PlaylistStatusEnum.Completed,
    "https://open.spotify.com/album/xyz": PlaylistStatusEnum.Downloading,
    "https://open.spotify.com/album/err": PlaylistStatusEnum.Error,
  },
  trackStatusMap: {
    "https://open.spotify.com/track/t1": TrackStatusEnum.Completed,
  },
  albumTrackCountMap: {
    "https://open.spotify.com/album/partial": 8,
  },
};

describe("deriveIsDownloaded", () => {
  it("returns false when data is undefined", () => {
    expect(deriveIsDownloaded(undefined, "https://open.spotify.com/playlist/abc")).toBe(false);
  });

  it("returns true when playlist status is Completed", () => {
    expect(deriveIsDownloaded(data, "https://open.spotify.com/playlist/abc")).toBe(true);
  });

  it("returns false when url not in map", () => {
    expect(deriveIsDownloaded(data, "https://open.spotify.com/playlist/missing")).toBe(false);
  });

  it("returns false when status is Downloading (not Completed)", () => {
    expect(deriveIsDownloaded(data, "https://open.spotify.com/album/xyz")).toBe(false);
  });

  it("returns true when albumTrackCount >= expectedTrackCount", () => {
    expect(deriveIsDownloaded(data, "https://open.spotify.com/album/partial", 8)).toBe(true);
  });

  it("returns false when albumTrackCount < expectedTrackCount", () => {
    expect(deriveIsDownloaded(data, "https://open.spotify.com/album/partial", 10)).toBe(false);
  });

  it("ignores expectedTrackCount when it is 0", () => {
    expect(deriveIsDownloaded(data, "https://open.spotify.com/album/partial", 0)).toBe(false);
  });

  it("returns false for url absent from both maps with expectedTrackCount", () => {
    expect(deriveIsDownloaded(emptyData, "https://open.spotify.com/album/ghost", 5)).toBe(false);
  });
});

describe("deriveIsDownloading", () => {
  it("returns false when data is undefined", () => {
    expect(deriveIsDownloading(undefined, "https://open.spotify.com/album/xyz")).toBe(false);
  });

  it("returns true when status is Downloading", () => {
    expect(deriveIsDownloading(data, "https://open.spotify.com/album/xyz")).toBe(true);
  });

  it("returns false when status is Completed", () => {
    expect(deriveIsDownloading(data, "https://open.spotify.com/playlist/abc")).toBe(false);
  });

  it("returns false when status is Error", () => {
    expect(deriveIsDownloading(data, "https://open.spotify.com/album/err")).toBe(false);
  });

  it("returns false when url is not in map", () => {
    expect(deriveIsDownloading(data, "https://open.spotify.com/playlist/missing")).toBe(false);
  });
});
