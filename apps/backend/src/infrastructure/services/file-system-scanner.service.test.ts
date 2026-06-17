import type { IAudioMetadata } from "music-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileSystemScannerService } from "./file-system-scanner.service";

const tempDirs: string[] = [];

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

vi.mock("music-metadata", () => ({
  parseFile: vi.fn(),
}));

async function writeFile(filePath: string, content = "audio"): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
}

function makeMetadata(
  overrides: Partial<{
    pictures: Array<{ format: string; data: Buffer }>;
    duration: number;
  }> = {},
): IAudioMetadata {
  return {
    common: { picture: overrides.pictures ?? [] },
    format: { duration: overrides.duration ?? 120 },
    native: {},
    quality: { warnings: [] },
  } as unknown as IAudioMetadata;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

// ---------------------------------------------------------------------------
// Existing tests (unchanged)
// ---------------------------------------------------------------------------

describe("FileSystemScannerService artwork extraction", () => {
  it("keeps folder image as album image when present", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const albumDir = path.join(libraryRoot, "Artist", "Album");

    await writeFile(path.join(albumDir, "01 - Track.mp3"));
    await writeFile(path.join(albumDir, "folder.jpg"), "jpg-bytes");

    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue({
      common: {
        picture: [{ format: "image/png", data: Buffer.from("embedded") }],
      },
      format: { duration: 120 },
      native: {},
      quality: { warnings: [] },
    } as unknown as IAudioMetadata);

    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);

    expect(artists[0]?.albums[0]?.image).toBe(path.join(albumDir, "folder.jpg"));
  });

  it("extracts embedded artwork to deterministic cache path without using it as artist fallback", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const albumDir = path.join(libraryRoot, "Artist", "Album");

    const trackPath = path.join(albumDir, "01 - Track.mp3");
    await writeFile(trackPath);

    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue({
      common: {
        picture: [{ format: "image/jpeg", data: Buffer.from("embedded-cover") }],
      },
      format: { duration: 215 },
      native: {},
      quality: { warnings: [] },
    } as unknown as IAudioMetadata);

    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);

    const albumImage = artists[0]?.albums[0]?.image;
    expect(albumImage).toBeDefined();
    expect(albumImage).toContain(path.join(libraryRoot, ".spotiarr", "cache", "artwork"));
    expect(path.basename(albumImage ?? "")).toMatch(/^[a-f0-9]{32}\.jpg$/);
    await expect(fs.readFile(albumImage!)).resolves.toEqual(Buffer.from("embedded-cover"));
    expect(artists[0]?.image).toBeUndefined();
  });

  it("does not create cached artwork when embedded picture is missing", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const albumDir = path.join(libraryRoot, "Artist", "Album");
    await writeFile(path.join(albumDir, "01 - Track.mp3"));

    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue({
      common: { picture: [] },
      format: { duration: 100 },
      native: {},
      quality: { warnings: [] },
    } as unknown as IAudioMetadata);

    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);

    expect(artists[0]?.albums[0]?.image).toBeUndefined();
    expect(artists[0]?.image).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// fileExists
// ---------------------------------------------------------------------------

describe("FileSystemScannerService.fileExists", () => {
  it("returns true when the file exists", async () => {
    const dir = await makeTempDir("fe-");
    const filePath = path.join(dir, "exists.mp3");
    await fs.writeFile(filePath, "data");
    const service = new FileSystemScannerService();
    await expect(service.fileExists(filePath)).resolves.toBe(true);
  });

  it("returns false when the file does not exist", async () => {
    const dir = await makeTempDir("fe-");
    const service = new FileSystemScannerService();
    await expect(service.fileExists(path.join(dir, "no-such-file.mp3"))).resolves.toBe(false);
  });
});

// ---------------------------------------------------------------------------
// scanMusicLibrary — top-level filtering
// ---------------------------------------------------------------------------

describe("FileSystemScannerService.scanMusicLibrary — top-level filtering", () => {
  it("returns [] when readdir throws at the library root", async () => {
    const service = new FileSystemScannerService();
    const result = await service.scanMusicLibrary("/tmp/__nonexistent_spotiarr_test_dir__");
    expect(result).toEqual([]);
  });

  it("skips the 'Playlists' folder", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Playlists", "Album", "01 - Track.mp3"));
    await writeFile(path.join(libraryRoot, "Artist", "Album", "01 - Track.mp3"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(makeMetadata());
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    const names = artists.map((a) => a.name);
    expect(names).not.toContain("Playlists");
    expect(names).toContain("Artist");
  });

  it("skips dot-folders (hidden directories)", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, ".hidden", "Album", "01 - Track.mp3"));
    await writeFile(path.join(libraryRoot, "Artist", "Album", "01 - Track.mp3"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(makeMetadata());
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    const names = artists.map((a) => a.name);
    expect(names).not.toContain(".hidden");
    expect(names).toContain("Artist");
  });

  it("skips non-directory entries at library root", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await fs.writeFile(path.join(libraryRoot, "readme.txt"), "text");
    await writeFile(path.join(libraryRoot, "Artist", "Album", "01 - Track.mp3"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(makeMetadata());
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    expect(artists.length).toBe(1);
    expect(artists[0]?.name).toBe("Artist");
  });

  it("excludes an artist whose subdirectories contain no audio files", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const emptyAlbumDir = path.join(libraryRoot, "EmptyArtist", "Album");
    await fs.mkdir(emptyAlbumDir, { recursive: true });
    await fs.writeFile(path.join(emptyAlbumDir, "cover.jpg"), "jpg");
    await writeFile(path.join(libraryRoot, "RealArtist", "Album", "01 - Track.mp3"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(makeMetadata());
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    const names = artists.map((a) => a.name);
    expect(names).not.toContain("EmptyArtist");
    expect(names).toContain("RealArtist");
  });
});

// ---------------------------------------------------------------------------
// Multiple audio formats
// ---------------------------------------------------------------------------

describe("FileSystemScannerService — multiple audio formats", () => {
  it("scans flac, m4a, and wav files alongside mp3", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const albumDir = path.join(libraryRoot, "Artist", "Album");
    await writeFile(path.join(albumDir, "01 - Flac Track.flac"));
    await writeFile(path.join(albumDir, "02 - M4a Track.m4a"));
    await writeFile(path.join(albumDir, "03 - Wav Track.wav"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(makeMetadata({ duration: 180 }));
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    const tracks = artists[0]?.albums[0]?.tracks ?? [];
    expect(tracks.length).toBe(3);
    const formats = tracks.map((t) => t.format);
    expect(formats).toContain("flac");
    expect(formats).toContain("m4a");
    expect(formats).toContain("wav");
  });
});

// ---------------------------------------------------------------------------
// parseFileName — exercised through scanMusicLibrary
// ---------------------------------------------------------------------------

describe("FileSystemScannerService — parseFileName via scanMusicLibrary", () => {
  async function scanSingleTrack(libraryRoot: string) {
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(makeMetadata({ duration: 60 }));
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    return artists[0]?.albums[0]?.tracks[0];
  }

  it("parses disc-track format '1-01 - Track Name.mp3' → discNumber=1, trackNumber=1", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album", "1-01 - Track Name.mp3"));
    const track = await scanSingleTrack(libraryRoot);
    expect(track?.discNumber).toBe(1);
    expect(track?.trackNumber).toBe(1);
    expect(track?.name).toBe("Track Name");
  });

  it("parses simple track format '01 - Track Name.mp3' → trackNumber=1, no discNumber", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album", "01 - Track Name.mp3"));
    const track = await scanSingleTrack(libraryRoot);
    expect(track?.trackNumber).toBe(1);
    expect(track?.discNumber).toBeUndefined();
    expect(track?.name).toBe("Track Name");
  });

  it("parses artist-track format '01 - Artist Name - Track Name.mp3' → trackNumber=1, name is last segment", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album", "01 - Artist Name - Track Name.mp3"));
    const track = await scanSingleTrack(libraryRoot);
    expect(track?.trackNumber).toBe(1);
    expect(track?.name).toBe("Track Name");
  });

  it("parses no-pattern format 'Just A Name.mp3' → no trackNumber, name from filename stem", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album", "Just A Name.mp3"));
    const track = await scanSingleTrack(libraryRoot);
    expect(track?.trackNumber).toBeUndefined();
    expect(track?.discNumber).toBeUndefined();
    expect(track?.name).toBe("Just A Name");
  });
});

// ---------------------------------------------------------------------------
// extractYear — exercised through album name
// ---------------------------------------------------------------------------

describe("FileSystemScannerService — extractYear via scanMusicLibrary", () => {
  async function scanAlbumYear(libraryRoot: string) {
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(makeMetadata());
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    return artists[0]?.albums[0]?.year;
  }

  it("extracts year from album name with parentheses 'Album (2023)'", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album (2023)", "01 - Track.mp3"));
    const year = await scanAlbumYear(libraryRoot);
    expect(year).toBe(2023);
  });

  it("extracts year from album name with brackets 'Album [1995]'", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album [1995]", "01 - Track.mp3"));
    const year = await scanAlbumYear(libraryRoot);
    expect(year).toBe(1995);
  });

  it("returns undefined when album name has no year pattern", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Just An Album", "01 - Track.mp3"));
    const year = await scanAlbumYear(libraryRoot);
    expect(year).toBeUndefined();
  });

  it("returns undefined for a future year beyond current year + 1", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album (2100)", "01 - Track.mp3"));
    const year = await scanAlbumYear(libraryRoot);
    expect(year).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// findImage priority — exercised through album image
// ---------------------------------------------------------------------------

describe("FileSystemScannerService — findImage priority", () => {
  async function scanAlbumImage(libraryRoot: string) {
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(makeMetadata({ pictures: [] }));
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    return artists[0]?.albums[0]?.image;
  }

  it("picks folder.jpg over cover.jpg when both are present", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const albumDir = path.join(libraryRoot, "Artist", "Album");
    await writeFile(path.join(albumDir, "01 - Track.mp3"));
    await fs.writeFile(path.join(albumDir, "folder.jpg"), "folder");
    await fs.writeFile(path.join(albumDir, "cover.jpg"), "cover");
    const image = await scanAlbumImage(libraryRoot);
    expect(image).toBe(path.join(albumDir, "folder.jpg"));
  });

  it("falls back to cover.jpg when no folder.jpg is present", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const albumDir = path.join(libraryRoot, "Artist", "Album");
    await writeFile(path.join(albumDir, "01 - Track.mp3"));
    await fs.writeFile(path.join(albumDir, "cover.jpg"), "cover");
    const image = await scanAlbumImage(libraryRoot);
    expect(image).toBe(path.join(albumDir, "cover.jpg"));
  });

  it("finds front.jpg as a priority image", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const albumDir = path.join(libraryRoot, "Artist", "Album");
    await writeFile(path.join(albumDir, "01 - Track.mp3"));
    await fs.writeFile(path.join(albumDir, "front.jpg"), "front");
    const image = await scanAlbumImage(libraryRoot);
    expect(image).toBe(path.join(albumDir, "front.jpg"));
  });

  it("falls back to any image when no priority-named file is present", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const albumDir = path.join(libraryRoot, "Artist", "Album");
    await writeFile(path.join(albumDir, "01 - Track.mp3"));
    await fs.writeFile(path.join(albumDir, "random-art.jpg"), "art");
    const image = await scanAlbumImage(libraryRoot);
    expect(image).toBe(path.join(albumDir, "random-art.jpg"));
  });

  it("returns undefined when no images are present in the album directory", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album", "01 - Track.mp3"));
    const image = await scanAlbumImage(libraryRoot);
    expect(image).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getImageExtensionFromMime — via embedded artwork output file extension
// ---------------------------------------------------------------------------

describe("FileSystemScannerService — getImageExtensionFromMime via embedded artwork", () => {
  it("writes a .png file when mime is 'image/png'", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album", "01 - Track.mp3"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(
      makeMetadata({ pictures: [{ format: "image/png", data: Buffer.from("pngdata") }] }),
    );
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    const image = artists[0]?.albums[0]?.image;
    expect(image).toBeDefined();
    expect(path.extname(image!)).toBe(".png");
  });

  it("writes a .webp file when mime is 'image/webp'", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album", "01 - Track.mp3"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(
      makeMetadata({ pictures: [{ format: "image/webp", data: Buffer.from("webpdata") }] }),
    );
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    const image = artists[0]?.albums[0]?.image;
    expect(image).toBeDefined();
    expect(path.extname(image!)).toBe(".webp");
  });

  it("skips a picture with an unsupported mime type (image/gif) and produces no album image", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album", "01 - Track.mp3"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(
      makeMetadata({ pictures: [{ format: "image/gif", data: Buffer.from("gifdata") }] }),
    );
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    expect(artists[0]?.albums[0]?.image).toBeUndefined();
  });

  it("skips a picture with undefined mime type and produces no album image", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album", "01 - Track.mp3"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue({
      common: { picture: [{ format: undefined, data: Buffer.from("data") }] },
      format: { duration: 60 },
      native: {},
      quality: { warnings: [] },
    } as unknown as IAudioMetadata);
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    expect(artists[0]?.albums[0]?.image).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// extractEmbeddedArtwork — cache reuse
// ---------------------------------------------------------------------------

describe("FileSystemScannerService — extractEmbeddedArtwork cache reuse", () => {
  it("reuses cached artwork on a second scan without overwriting the file", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    await writeFile(path.join(libraryRoot, "Artist", "Album", "01 - Track.mp3"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(
      makeMetadata({ pictures: [{ format: "image/jpeg", data: Buffer.from("cover-data") }] }),
    );
    const service = new FileSystemScannerService();

    const firstScan = await service.scanMusicLibrary(libraryRoot);
    const firstImage = firstScan[0]?.albums[0]?.image;
    expect(firstImage).toBeDefined();

    // Replace cached file with a sentinel — if re-extracted the sentinel would be overwritten
    await fs.writeFile(firstImage!, Buffer.from("sentinel"));

    const secondScan = await service.scanMusicLibrary(libraryRoot);
    const secondImage = secondScan[0]?.albums[0]?.image;
    expect(secondImage).toBe(firstImage);
    await expect(fs.readFile(secondImage!)).resolves.toEqual(Buffer.from("sentinel"));
  });
});

// ---------------------------------------------------------------------------
// extractEmbeddedArtwork — first track parseFile throws, second succeeds
// ---------------------------------------------------------------------------

describe("FileSystemScannerService — extractEmbeddedArtwork multi-track fallback", () => {
  it("skips a track where parseFile throws during artwork extraction and succeeds on the next", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const albumDir = path.join(libraryRoot, "Artist", "Album");
    await writeFile(path.join(albumDir, "01 - First.mp3"));
    await writeFile(path.join(albumDir, "02 - Second.mp3"));

    const { parseFile } = await import("music-metadata");
    // scanTrack uses skipCovers:true; extractEmbeddedArtwork uses skipCovers:false.
    // Track calls come first, then artwork extraction calls.
    let artworkCallCount = 0;
    vi.mocked(parseFile).mockImplementation(async (_path, opts) => {
      if (opts?.skipCovers === false) {
        artworkCallCount++;
        if (artworkCallCount === 1) {
          throw new Error("metadata read failed for first track");
        }
        return makeMetadata({ pictures: [{ format: "image/jpeg", data: Buffer.from("art") }] });
      }
      // scanTrack calls (skipCovers:true) — plain metadata, no pictures needed
      return makeMetadata({ pictures: [] });
    });

    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    const image = artists[0]?.albums[0]?.image;
    expect(image).toBeDefined();
    expect(path.extname(image!)).toBe(".jpg");
  });
});

// ---------------------------------------------------------------------------
// Track sort order
// ---------------------------------------------------------------------------

describe("FileSystemScannerService — track sort order", () => {
  it("sorts tracks with disc numbers by disc then track number", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const albumDir = path.join(libraryRoot, "Artist", "Album");
    await writeFile(path.join(albumDir, "2-01 - Disc2 Track1.mp3"));
    await writeFile(path.join(albumDir, "1-02 - Disc1 Track2.mp3"));
    await writeFile(path.join(albumDir, "1-01 - Disc1 Track1.mp3"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(makeMetadata());
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    const tracks = artists[0]?.albums[0]?.tracks ?? [];
    expect(tracks.length).toBe(3);
    expect(tracks[0]?.discNumber).toBe(1);
    expect(tracks[0]?.trackNumber).toBe(1);
    expect(tracks[1]?.discNumber).toBe(1);
    expect(tracks[1]?.trackNumber).toBe(2);
    expect(tracks[2]?.discNumber).toBe(2);
    expect(tracks[2]?.trackNumber).toBe(1);
  });

  it("sorts tracks without track numbers by filename lexicographically", async () => {
    const libraryRoot = await makeTempDir("scanner-lib-");
    const albumDir = path.join(libraryRoot, "Artist", "Album");
    await writeFile(path.join(albumDir, "Charlie.mp3"));
    await writeFile(path.join(albumDir, "Alpha.mp3"));
    await writeFile(path.join(albumDir, "Bravo.mp3"));
    const { parseFile } = await import("music-metadata");
    vi.mocked(parseFile).mockResolvedValue(makeMetadata());
    const service = new FileSystemScannerService();
    const artists = await service.scanMusicLibrary(libraryRoot);
    const fileNames = (artists[0]?.albums[0]?.tracks ?? []).map((t) => t.fileName);
    expect(fileNames).toEqual(["Alpha.mp3", "Bravo.mp3", "Charlie.mp3"]);
  });
});
