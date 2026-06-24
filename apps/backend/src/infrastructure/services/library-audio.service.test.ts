import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileSystemLibraryAudioService } from "./library-audio.service";

const loggerMock = vi.hoisted(() => {
  const mock = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  mock.child.mockReturnValue(mock);
  return mock;
});
vi.mock("@/infrastructure/logging/logger", () => ({ logger: loggerMock }));

const tempDirs: string[] = [];

async function makeTempDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("FileSystemLibraryAudioService", () => {
  it("returns ok for audio files inside downloads root", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-root-");
    const artistDir = path.join(downloadsRoot, "Artist");
    const trackPath = path.join(artistDir, "song.mp3");

    await fs.mkdir(artistDir, { recursive: true });
    await fs.writeFile(trackPath, "audio-data");

    const service = new FileSystemLibraryAudioService(downloadsRoot);
    const result = await service.resolveAudio(trackPath);

    expect(result).toEqual({
      kind: "ok",
      absolutePath: await fs.realpath(trackPath),
      contentType: "audio/mpeg",
      sizeBytes: 10,
      mtimeMs: expect.any(Number),
      ino: expect.any(Number),
    });
  });

  it("rejects paths outside downloads root", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-root-");
    const outsideRoot = await makeTempDir("lib-audio-out-");
    const outsideFile = path.join(outsideRoot, "outside.mp3");

    await fs.writeFile(outsideFile, "audio-data");

    const service = new FileSystemLibraryAudioService(downloadsRoot);
    const result = await service.resolveAudio(outsideFile);

    expect(result).toEqual({ kind: "reject", reason: "outside-root" });
  });

  it("rejects path traversal attempts", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-root-");
    const outsideRoot = await makeTempDir("lib-audio-out-");
    const outsideFile = path.join(outsideRoot, "outside.mp3");

    await fs.writeFile(outsideFile, "audio-data");

    const traversalPath = path.join(downloadsRoot, "..", path.basename(outsideRoot), "outside.mp3");
    const service = new FileSystemLibraryAudioService(downloadsRoot);
    const result = await service.resolveAudio(traversalPath);

    expect(result).toEqual({ kind: "reject", reason: "outside-root" });
  });

  it("rejects symlink escapes outside downloads root", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-root-");
    const outsideRoot = await makeTempDir("lib-audio-out-");
    const outsideFile = path.join(outsideRoot, "outside.mp3");
    const symlinkPath = path.join(downloadsRoot, "link.mp3");

    await fs.writeFile(outsideFile, "audio-data");
    await fs.symlink(outsideFile, symlinkPath);

    const service = new FileSystemLibraryAudioService(downloadsRoot);
    const result = await service.resolveAudio(symlinkPath);

    expect(result).toEqual({ kind: "reject", reason: "outside-root" });
  });

  it("rejects non-audio extension", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-root-");
    const filePath = path.join(downloadsRoot, "cover.jpg");

    await fs.writeFile(filePath, "image-data");

    const service = new FileSystemLibraryAudioService(downloadsRoot);
    const result = await service.resolveAudio(filePath);

    expect(result).toEqual({ kind: "reject", reason: "bad-extension" });
  });

  it("rejects missing path", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-root-");
    const service = new FileSystemLibraryAudioService(downloadsRoot);
    const result = await service.resolveAudio(undefined);

    expect(result).toEqual({ kind: "reject", reason: "missing-path" });
  });

  it("rejects files that do not exist", async () => {
    const downloadsRoot = await makeTempDir("lib-audio-root-");
    const missingPath = path.join(downloadsRoot, "missing.mp3");
    const service = new FileSystemLibraryAudioService(downloadsRoot);
    const result = await service.resolveAudio(missingPath);

    expect(result).toEqual({ kind: "reject", reason: "not-found" });
  });

  it("logs warning with reason category for rejected requests", async () => {
    loggerMock.warn.mockClear();
    const downloadsRoot = await makeTempDir("lib-audio-root-");
    const service = new FileSystemLibraryAudioService(downloadsRoot);

    const result = await service.resolveAudio(undefined);

    expect(result).toEqual({ kind: "reject", reason: "missing-path" });
    expect(loggerMock.warn).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "missing-path" }),
      "Request rejected",
    );
  });
});
