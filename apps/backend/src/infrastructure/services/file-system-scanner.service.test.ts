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

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

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

  it("extracts embedded artwork to deterministic cache path and falls back for artist image", async () => {
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
    expect(artists[0]?.image).toBe(albumImage);
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
