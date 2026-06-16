import type { ITrack } from "@spotiarr/shared";
import { mkdir } from "node:fs/promises";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { FileSystemTrackPathService } from "./file-system-track-path.service";

vi.mock("../setup/environment", () => ({
  getEnv: () => ({ DOWNLOADS: "/music" }),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

const mkdirMock = vi.mocked(mkdir);

function makeSettingsService(format = "mp3") {
  return {
    getString: vi.fn().mockResolvedValue(format),
  } as any;
}

function makeTrack(overrides: Partial<ITrack> = {}): ITrack {
  return {
    id: "t1",
    name: "Cool Song",
    artist: "Cool Artist",
    albumArtist: "Album Artist",
    album: "Cool Album",
    trackNumber: 3,
    discNumber: 1,
    durationMs: 200000,
    playlistIndex: 5,
    status: "completed" as any,
    error: null,
    youtubeUrl: null,
    spotifyId: null,
    playlistId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as ITrack;
}

describe("FileSystemTrackPathService — path building", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("getMusicLibraryPath returns the DOWNLOADS env value", () => {
    const service = new FileSystemTrackPathService(makeSettingsService());
    expect(service.getMusicLibraryPath()).toBe("/music");
  });

  it("getArtistFolderPath resolves Artist under the library root", () => {
    const service = new FileSystemTrackPathService(makeSettingsService());
    const result = service.getArtistFolderPath("Radiohead");
    expect(result).toBe("/music/Radiohead");
  });

  it("getAlbumFolderPath resolves Artist/Album under the library root", () => {
    const service = new FileSystemTrackPathService(makeSettingsService());
    const result = service.getAlbumFolderPath("Radiohead", "OK Computer");
    expect(result).toBe("/music/Radiohead/OK Computer");
  });

  it("getPlaylistsLibraryPath resolves Playlists/ under the library root", () => {
    const service = new FileSystemTrackPathService(makeSettingsService());
    expect(service.getPlaylistsLibraryPath()).toBe("/music/Playlists");
  });

  it("getPlaylistFolderPath resolves a named playlist under Playlists/", () => {
    const service = new FileSystemTrackPathService(makeSettingsService());
    expect(service.getPlaylistFolderPath("Chill Vibes")).toBe("/music/Playlists/Chill Vibes");
  });
});

describe("FileSystemTrackPathService — stripFileIllegalChars", () => {
  it("replaces illegal characters with hyphens", () => {
    const service = new FileSystemTrackPathService(makeSettingsService());
    expect(service.stripFileIllegalChars('AC/DC: "The Band"')).toBe("AC-DC- -The Band-");
  });

  it("leaves safe characters unchanged", () => {
    const service = new FileSystemTrackPathService(makeSettingsService());
    expect(service.stripFileIllegalChars("Safe Name 123")).toBe("Safe Name 123");
  });
});

describe("FileSystemTrackPathService — getTrackFileName (album track)", () => {
  it("builds an album track path using albumArtist, album, and track number", async () => {
    const service = new FileSystemTrackPathService(makeSettingsService("mp3"));
    const track = makeTrack({
      name: "Creep",
      albumArtist: "Radiohead",
      album: "Pablo Honey",
      trackNumber: 2,
      discNumber: 1,
      playlistIndex: undefined,
    });

    const result = await service.getTrackFileName(track);

    expect(result).toBe("/music/Radiohead/Pablo Honey/02 - Creep.mp3");
  });

  it("pads track number to 2 digits", async () => {
    const service = new FileSystemTrackPathService(makeSettingsService("mp3"));
    const track = makeTrack({ trackNumber: 1, playlistIndex: undefined });

    const result = await service.getTrackFileName(track);

    expect(result).toContain("01 -");
  });

  it("adds a disc prefix when discNumber > 1", async () => {
    const service = new FileSystemTrackPathService(makeSettingsService("mp3"));
    const track = makeTrack({
      trackNumber: 3,
      discNumber: 2,
      playlistIndex: undefined,
    });

    const result = await service.getTrackFileName(track);

    expect(result).toContain("2-03 -");
  });

  it("omits disc prefix when discNumber is 1", async () => {
    const service = new FileSystemTrackPathService(makeSettingsService("mp3"));
    const track = makeTrack({ discNumber: 1, playlistIndex: undefined });

    const result = await service.getTrackFileName(track);

    expect(result).not.toMatch(/^\d+-/);
  });

  it("uses 'Unknown Artist' when albumArtist and artist are both absent", async () => {
    const service = new FileSystemTrackPathService(makeSettingsService("mp3"));
    const track = makeTrack({
      albumArtist: undefined as any,
      artist: undefined as any,
      playlistIndex: undefined,
    });

    const result = await service.getTrackFileName(track);

    expect(result).toContain("Unknown Artist");
  });

  it("uses 'Unknown Album' when album is absent", async () => {
    const service = new FileSystemTrackPathService(makeSettingsService("mp3"));
    const track = makeTrack({ album: undefined as any, playlistIndex: undefined });

    const result = await service.getTrackFileName(track);

    expect(result).toContain("Unknown Album");
  });

  it("uses the format from settings as the file extension", async () => {
    const service = new FileSystemTrackPathService(makeSettingsService("flac"));
    const track = makeTrack({ playlistIndex: undefined });

    const result = await service.getTrackFileName(track);

    expect(result).toMatch(/\.flac$/);
  });
});

describe("FileSystemTrackPathService — getTrackFileName (playlist track)", () => {
  it("builds a playlist track path using playlistIndex when provided", async () => {
    const service = new FileSystemTrackPathService(makeSettingsService("mp3"));
    const track = makeTrack({ playlistIndex: 7, albumArtist: "Artist", name: "Song" });

    const result = await service.getTrackFileName(track, "My Playlist");

    expect(result).toContain("Playlists");
    expect(result).toContain("My Playlist");
    expect(result).toContain("07 - Artist - Song.mp3");
  });

  it("falls back to trackNumber when playlistIndex is null", async () => {
    const service = new FileSystemTrackPathService(makeSettingsService("mp3"));
    const track = makeTrack({
      playlistIndex: undefined,
      trackNumber: 4,
      albumArtist: "A",
      name: "T",
    });

    const result = await service.getTrackFileName(track, "PL");

    expect(result).toContain("04 - A - T.mp3");
  });
});

describe("FileSystemTrackPathService — ensureParentDirectory", () => {
  it("calls mkdir with recursive: true on the parent directory", async () => {
    const service = new FileSystemTrackPathService(makeSettingsService());

    await service.ensureParentDirectory("/music/Artist/Album/01 - Track.mp3");

    expect(mkdirMock).toHaveBeenCalledOnce();
    expect(mkdirMock).toHaveBeenCalledWith("/music/Artist/Album", { recursive: true });
  });
});
