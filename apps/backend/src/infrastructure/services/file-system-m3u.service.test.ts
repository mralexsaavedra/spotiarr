import { TrackStatusEnum, type IPlaylist, type ITrack } from "@spotiarr/shared";
import * as fs from "fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { FileSystemM3uService } from "./file-system-m3u.service";

vi.mock("fs", () => ({
  writeFileSync: vi.fn(),
}));

const writeFileSyncMock = vi.mocked(fs.writeFileSync);

function makePlaylist(overrides: Partial<IPlaylist> = {}): IPlaylist {
  return {
    id: "pl-1",
    name: "My Playlist",
    spotifyId: "spotify-pl-1",
    description: null,
    coverUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as IPlaylist;
}

function makeTrack(overrides: Partial<ITrack> = {}): ITrack {
  return {
    id: "track-1",
    name: "Cool Song",
    artist: "Cool Artist",
    albumArtist: "Cool Artist",
    album: "Cool Album",
    status: TrackStatusEnum.Completed,
    trackNumber: 1,
    discNumber: 1,
    durationMs: 180000,
    playlistIndex: 1,
    playlistId: "pl-1",
    error: null,
    youtubeUrl: null,
    spotifyId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as ITrack;
}

function makeSettingsService(enabled = true) {
  return {
    getBoolean: vi.fn().mockResolvedValue(enabled),
    getString: vi.fn().mockResolvedValue("mp3"),
  } as any;
}

function makeTrackPathService(fileName = "01 - Cool Artist - Cool Song.mp3") {
  return {
    getTrackFileName: vi.fn().mockResolvedValue(`/downloads/Playlists/My Playlist/${fileName}`),
  } as any;
}

describe("FileSystemM3uService — generateM3uFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing when M3U generation is disabled", async () => {
    const settings = makeSettingsService(false);
    const trackPath = makeTrackPathService();
    const service = new FileSystemM3uService(settings, trackPath);
    const playlist = makePlaylist();
    const track = makeTrack();

    await service.generateM3uFile(playlist, [track], "/downloads/Playlists/My Playlist");

    expect(writeFileSyncMock).not.toHaveBeenCalled();
  });

  it("does nothing when there are no completed tracks", async () => {
    const settings = makeSettingsService(true);
    const trackPath = makeTrackPathService();
    const service = new FileSystemM3uService(settings, trackPath);
    const playlist = makePlaylist();
    const pendingTrack = makeTrack({ status: TrackStatusEnum.New });

    await service.generateM3uFile(playlist, [pendingTrack], "/downloads/Playlists/My Playlist");

    expect(writeFileSyncMock).not.toHaveBeenCalled();
  });

  it("writes an M3U8 file when there is at least one completed track", async () => {
    const settings = makeSettingsService(true);
    const trackPath = makeTrackPathService();
    const service = new FileSystemM3uService(settings, trackPath);
    const playlist = makePlaylist();
    const track = makeTrack();

    await service.generateM3uFile(playlist, [track], "/downloads/Playlists/My Playlist");

    expect(writeFileSyncMock).toHaveBeenCalledOnce();
  });

  it("writes the file with UTF-8 encoding", async () => {
    const settings = makeSettingsService(true);
    const trackPath = makeTrackPathService();
    const service = new FileSystemM3uService(settings, trackPath);
    const playlist = makePlaylist();
    const track = makeTrack();

    await service.generateM3uFile(playlist, [track], "/downloads/Playlists/My Playlist");

    const [, , encoding] = writeFileSyncMock.mock.calls[0];
    expect(encoding).toBe("utf-8");
  });

  it("generates content starting with #EXTM3U header", async () => {
    const settings = makeSettingsService(true);
    const trackPath = makeTrackPathService();
    const service = new FileSystemM3uService(settings, trackPath);
    const playlist = makePlaylist();
    const track = makeTrack();

    await service.generateM3uFile(playlist, [track], "/downloads/Playlists/My Playlist");

    const [, content] = writeFileSyncMock.mock.calls[0];
    expect(String(content)).toMatch(/^#EXTM3U/);
  });

  it("includes the playlist name in the #PLAYLIST directive", async () => {
    const settings = makeSettingsService(true);
    const trackPath = makeTrackPathService();
    const service = new FileSystemM3uService(settings, trackPath);
    const playlist = makePlaylist({ name: "Chill Vibes" });
    const track = makeTrack();

    await service.generateM3uFile(playlist, [track], "/downloads/Playlists/Chill Vibes");

    const [, content] = writeFileSyncMock.mock.calls[0];
    expect(String(content)).toContain("#PLAYLIST:Chill Vibes");
  });

  it("includes #EXTINF line with duration and artist/title", async () => {
    const settings = makeSettingsService(true);
    const trackPath = makeTrackPathService();
    const service = new FileSystemM3uService(settings, trackPath);
    const playlist = makePlaylist();
    // 180000ms = 180s
    const track = makeTrack({ durationMs: 180000, artist: "Artist", name: "Title" });

    await service.generateM3uFile(playlist, [track], "/downloads/Playlists/My Playlist");

    const [, content] = writeFileSyncMock.mock.calls[0];
    expect(String(content)).toContain("#EXTINF:180,Artist - Title");
  });

  it("uses -1 as duration when track has no durationMs", async () => {
    const settings = makeSettingsService(true);
    const trackPath = makeTrackPathService();
    const service = new FileSystemM3uService(settings, trackPath);
    const playlist = makePlaylist();
    const track = makeTrack({ durationMs: null as any });

    await service.generateM3uFile(playlist, [track], "/downloads/Playlists/My Playlist");

    const [, content] = writeFileSyncMock.mock.calls[0];
    expect(String(content)).toContain("#EXTINF:-1,");
  });

  it("includes #EXTART line with the artist name", async () => {
    const settings = makeSettingsService(true);
    const trackPath = makeTrackPathService();
    const service = new FileSystemM3uService(settings, trackPath);
    const playlist = makePlaylist();
    const track = makeTrack({ artist: "The Beatles" });

    await service.generateM3uFile(playlist, [track], "/downloads/Playlists/My Playlist");

    const [, content] = writeFileSyncMock.mock.calls[0];
    expect(String(content)).toContain("#EXTART:The Beatles");
  });

  it("only includes completed tracks, filtering out non-completed ones", async () => {
    const settings = makeSettingsService(true);
    const trackPath = makeTrackPathService();
    const service = new FileSystemM3uService(settings, trackPath);
    const playlist = makePlaylist();
    const completedTrack = makeTrack({ id: "t1", name: "Done Track" });
    const pendingTrack = makeTrack({
      id: "t2",
      name: "Pending Track",
      status: TrackStatusEnum.New,
    });

    await service.generateM3uFile(
      playlist,
      [completedTrack, pendingTrack],
      "/downloads/Playlists/My Playlist",
    );

    const [, content] = writeFileSyncMock.mock.calls[0];
    expect(String(content)).toContain("Done Track");
    expect(String(content)).not.toContain("Pending Track");
  });

  it("sanitizes the playlist name in the output file path", async () => {
    const settings = makeSettingsService(true);
    const trackPath = makeTrackPathService();
    const service = new FileSystemM3uService(settings, trackPath);
    // Name with characters that need sanitization
    const playlist = makePlaylist({ name: 'My: "Playlist"' });
    const track = makeTrack();

    await service.generateM3uFile(playlist, [track], "/downloads/Playlists");

    const [filePath] = writeFileSyncMock.mock.calls[0];
    // The written path must not contain colon or quotes
    expect(String(filePath)).not.toMatch(/[:"]/);
  });

  it("swallows errors and does not throw", async () => {
    const settings = makeSettingsService(true);
    const trackPath = {
      getTrackFileName: vi.fn().mockRejectedValue(new Error("path failure")),
    } as any;
    const service = new FileSystemM3uService(settings, trackPath);
    const playlist = makePlaylist();
    const track = makeTrack();

    await expect(
      service.generateM3uFile(playlist, [track], "/downloads/Playlists/My Playlist"),
    ).resolves.not.toThrow();
  });
});

describe("FileSystemM3uService — getCompletedTracksCount", () => {
  it("returns the number of completed tracks", () => {
    const service = new FileSystemM3uService({} as any, {} as any);
    const tracks = [
      makeTrack({ status: TrackStatusEnum.Completed }),
      makeTrack({ status: TrackStatusEnum.New }),
      makeTrack({ status: TrackStatusEnum.Completed }),
    ];

    expect(service.getCompletedTracksCount(tracks)).toBe(2);
  });

  it("returns 0 when no tracks are completed", () => {
    const service = new FileSystemM3uService({} as any, {} as any);
    const tracks = [makeTrack({ status: TrackStatusEnum.New })];

    expect(service.getCompletedTracksCount(tracks)).toBe(0);
  });

  it("returns 0 for an empty track list", () => {
    const service = new FileSystemM3uService({} as any, {} as any);
    expect(service.getCompletedTracksCount([])).toBe(0);
  });
});
