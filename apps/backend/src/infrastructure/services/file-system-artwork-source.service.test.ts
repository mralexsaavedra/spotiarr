import { describe, expect, it, vi } from "vitest";
import { FileSystemArtworkSourceService } from "./file-system-artwork-source.service";

const { mockAccess, mockReaddir, mockReadFile } = vi.hoisted(() => ({
  mockAccess: vi.fn(),
  mockReaddir: vi.fn(),
  mockReadFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  access: mockAccess,
  readdir: mockReaddir,
  readFile: mockReadFile,
}));

function makeDirent(name: string, opts: { isDir?: boolean; isFile?: boolean } = {}) {
  return {
    name,
    isDirectory: () => opts.isDir ?? false,
    isFile: () => opts.isFile ?? false,
  };
}

function makeService(overrides: { artistPath?: string; albumPath?: string } = {}) {
  const pathPort = {
    getArtistFolderPath: vi.fn().mockReturnValue(overrides.artistPath ?? "/music/Artist"),
    getAlbumFolderPath: vi.fn().mockReturnValue(overrides.albumPath ?? "/music/Artist/Album"),
  } as any;
  const artworkAssets = {
    writeFileIfMissing: vi.fn().mockResolvedValue(undefined),
    downloadImage: vi.fn().mockResolvedValue(null),
  } as any;
  return {
    service: new FileSystemArtworkSourceService(pathPort, artworkAssets),
    pathPort,
    artworkAssets,
  };
}

describe("FileSystemArtworkSourceService", () => {
  // ── hasArtistArtwork ──────────────────────────────────────────────────────

  describe("hasArtistArtwork", () => {
    it("returns true when folder.jpg is accessible", async () => {
      mockAccess.mockResolvedValue(undefined);
      const { service } = makeService({ artistPath: "/music/Artist" });

      await expect(service.hasArtistArtwork("Artist")).resolves.toBe(true);
    });

    it("returns false when folder.jpg is not accessible", async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      const { service } = makeService({ artistPath: "/music/Artist" });

      await expect(service.hasArtistArtwork("Artist")).resolves.toBe(false);
    });
  });

  // ── hasAlbumArtwork ───────────────────────────────────────────────────────

  describe("hasAlbumArtwork", () => {
    it("returns true when cover.jpg is accessible", async () => {
      mockAccess.mockResolvedValue(undefined);
      const { service } = makeService({ albumPath: "/music/Artist/Album" });

      await expect(service.hasAlbumArtwork("Artist", "Album")).resolves.toBe(true);
    });

    it("returns false when cover.jpg is not accessible", async () => {
      mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      const { service } = makeService({ albumPath: "/music/Artist/Album" });

      await expect(service.hasAlbumArtwork("Artist", "Album")).resolves.toBe(false);
    });
  });

  // ── findArtistAlbumArtwork ────────────────────────────────────────────────

  describe("findArtistAlbumArtwork", () => {
    it("returns null when artist directory does not exist (ENOENT)", async () => {
      mockReaddir.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      const { service } = makeService({ artistPath: "/music/Artist" });

      await expect(service.findArtistAlbumArtwork("Artist")).resolves.toBeNull();
    });

    it("rethrows non-ENOENT errors from readdir", async () => {
      mockReaddir.mockRejectedValue(Object.assign(new Error("EACCES"), { code: "EACCES" }));
      const { service } = makeService({ artistPath: "/music/Artist" });

      await expect(service.findArtistAlbumArtwork("Artist")).rejects.toThrow("EACCES");
    });

    it("returns null when artist directory has subdirs but none contain cover.jpg", async () => {
      mockReaddir.mockResolvedValue([makeDirent("AlbumA", { isDir: true })]);
      // access rejects for every cover.jpg check → file does not exist
      mockAccess.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
      const { service } = makeService({ artistPath: "/music/Artist" });

      await expect(service.findArtistAlbumArtwork("Artist")).resolves.toBeNull();
    });

    it("returns file:// URL for the first subdir that contains cover.jpg", async () => {
      mockReaddir.mockResolvedValue([
        makeDirent("AlbumA", { isDir: true }),
        makeDirent("AlbumB", { isDir: true }),
      ]);
      // First call (AlbumA/cover.jpg) resolves → exists
      mockAccess.mockResolvedValueOnce(undefined);
      const { service } = makeService({ artistPath: "/music/Artist" });

      await expect(service.findArtistAlbumArtwork("Artist")).resolves.toBe(
        "file:///music/Artist/AlbumA/cover.jpg",
      );
    });

    it("skips file entries (non-directories) and still finds cover.jpg in subdirs", async () => {
      mockReaddir.mockResolvedValue([
        makeDirent("artist.jpg", { isFile: true }),
        makeDirent("AlbumA", { isDir: true }),
      ]);
      mockAccess.mockResolvedValueOnce(undefined); // AlbumA/cover.jpg exists
      const { service } = makeService({ artistPath: "/music/Artist" });

      await expect(service.findArtistAlbumArtwork("Artist")).resolves.toBe(
        "file:///music/Artist/AlbumA/cover.jpg",
      );
    });

    it("returns null when artist directory only contains files (no subdirs)", async () => {
      mockReaddir.mockResolvedValue([makeDirent("folder.jpg", { isFile: true })]);
      const { service } = makeService({ artistPath: "/music/Artist" });

      await expect(service.findArtistAlbumArtwork("Artist")).resolves.toBeNull();
    });
  });

  // ── writeArtistArtworkIfMissing ───────────────────────────────────────────

  describe("writeArtistArtworkIfMissing", () => {
    it("returns false when downloadImage returns null (http:// URL)", async () => {
      const { service, artworkAssets } = makeService({ artistPath: "/music/Artist" });
      artworkAssets.downloadImage.mockResolvedValue(null);

      await expect(
        service.writeArtistArtworkIfMissing("Artist", "http://example.com/art.jpg"),
      ).resolves.toBe(false);

      expect(artworkAssets.writeFileIfMissing).not.toHaveBeenCalled();
    });

    it("returns true when downloadImage returns a Buffer (http:// URL)", async () => {
      const { service, artworkAssets } = makeService({ artistPath: "/music/Artist" });
      const buf = Buffer.from("img-data");
      artworkAssets.downloadImage.mockResolvedValue(buf);

      await expect(
        service.writeArtistArtworkIfMissing("Artist", "http://example.com/art.jpg"),
      ).resolves.toBe(true);

      expect(artworkAssets.writeFileIfMissing).toHaveBeenCalledWith(
        "/music/Artist/folder.jpg",
        buf,
      );
    });
  });

  // ── writeAlbumArtworkIfMissing ────────────────────────────────────────────

  describe("writeAlbumArtworkIfMissing", () => {
    it("returns true and reads local file when imageUrl uses file:// prefix", async () => {
      const buf = Buffer.from("local-img");
      mockReadFile.mockResolvedValue(buf);
      const { service, artworkAssets } = makeService({ albumPath: "/music/Artist/Album" });

      await expect(
        service.writeAlbumArtworkIfMissing("Artist", "Album", "file:///tmp/cover.jpg"),
      ).resolves.toBe(true);

      expect(mockReadFile).toHaveBeenCalledWith("/tmp/cover.jpg");
      expect(artworkAssets.writeFileIfMissing).toHaveBeenCalledWith(
        "/music/Artist/Album/cover.jpg",
        buf,
      );
    });

    it("returns true when downloadImage returns a Buffer (http:// URL)", async () => {
      const buf = Buffer.from("remote-img");
      const { service, artworkAssets } = makeService({ albumPath: "/music/Artist/Album" });
      artworkAssets.downloadImage.mockResolvedValue(buf);

      await expect(
        service.writeAlbumArtworkIfMissing("Artist", "Album", "http://example.com/cover.jpg"),
      ).resolves.toBe(true);

      expect(artworkAssets.writeFileIfMissing).toHaveBeenCalledWith(
        "/music/Artist/Album/cover.jpg",
        buf,
      );
    });
  });

  // ── listAlbumTrackPaths ───────────────────────────────────────────────────

  describe("listAlbumTrackPaths", () => {
    it("returns empty track list when album directory does not exist", async () => {
      const pathPort = {
        getArtistFolderPath: vi.fn(),
        getAlbumFolderPath: vi.fn().mockReturnValue("/missing/album"),
      } as any;
      const artworkAssets = {
        writeFileIfMissing: vi.fn(),
        downloadImage: vi.fn(),
      } as any;
      mockReaddir.mockRejectedValue(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));

      const service = new FileSystemArtworkSourceService(pathPort, artworkAssets);

      await expect(service.listAlbumTrackPaths("Artist", "Album")).resolves.toEqual([]);
    });

    it("returns only audio files and excludes non-audio files", async () => {
      const audioFiles = [
        "track01.mp3",
        "track02.flac",
        "track03.m4a",
        "track04.wav",
        "track05.ogg",
        "track06.opus",
        "track07.aac",
      ];
      const nonAudioFiles = ["cover.jpg", "notes.txt", "album.nfo"];

      mockReaddir.mockResolvedValue([
        ...audioFiles.map((name) => makeDirent(name, { isFile: true })),
        ...nonAudioFiles.map((name) => makeDirent(name, { isFile: true })),
        makeDirent("SubDir", { isDir: true }),
      ]);

      const { service } = makeService({ albumPath: "/music/Artist/Album" });
      const result = await service.listAlbumTrackPaths("Artist", "Album");

      expect(result).toHaveLength(audioFiles.length);
      expect(result).toEqual(
        expect.arrayContaining(audioFiles.map((f) => `/music/Artist/Album/${f}`)),
      );
      for (const nonAudio of nonAudioFiles) {
        expect(result).not.toContain(`/music/Artist/Album/${nonAudio}`);
      }
    });

    it("is case-insensitive for audio extensions (MP3, FLAC upper case)", async () => {
      mockReaddir.mockResolvedValue([
        makeDirent("TRACK.MP3", { isFile: true }),
        makeDirent("TRACK.FLAC", { isFile: true }),
      ]);

      const { service } = makeService({ albumPath: "/music/Artist/Album" });
      const result = await service.listAlbumTrackPaths("Artist", "Album");

      expect(result).toEqual(["/music/Artist/Album/TRACK.MP3", "/music/Artist/Album/TRACK.FLAC"]);
    });

    it("returns empty array when album directory contains only directories", async () => {
      mockReaddir.mockResolvedValue([makeDirent("Disc1", { isDir: true })]);

      const { service } = makeService({ albumPath: "/music/Artist/Album" });

      await expect(service.listAlbumTrackPaths("Artist", "Album")).resolves.toEqual([]);
    });

    it("rethrows non-ENOENT errors from readdir", async () => {
      mockReaddir.mockRejectedValue(Object.assign(new Error("EACCES"), { code: "EACCES" }));
      const { service } = makeService({ albumPath: "/music/Artist/Album" });

      await expect(service.listAlbumTrackPaths("Artist", "Album")).rejects.toThrow("EACCES");
    });
  });
});
