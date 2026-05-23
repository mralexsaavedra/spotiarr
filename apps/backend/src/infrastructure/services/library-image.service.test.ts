import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileSystemLibraryImageService } from "./library-image.service";

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

describe("FileSystemLibraryImageService", () => {
  it("returns ok for image files inside downloads root", async () => {
    const downloadsRoot = await makeTempDir("lib-img-root-");
    const artistDir = path.join(downloadsRoot, "Artist");
    const coverPath = path.join(artistDir, "cover.jpg");

    await fs.mkdir(artistDir, { recursive: true });
    await fs.writeFile(coverPath, "img");

    const service = new FileSystemLibraryImageService(downloadsRoot);
    const result = await service.resolveImage(coverPath);
    const expectedRealPath = await fs.realpath(coverPath);

    expect(result).toEqual({
      kind: "ok",
      absolutePath: expectedRealPath,
      contentType: "image/jpeg",
    });
  });

  it("rejects paths outside downloads root", async () => {
    const downloadsRoot = await makeTempDir("lib-img-root-");
    const outsideRoot = await makeTempDir("lib-img-out-");
    const outsideFile = path.join(outsideRoot, "outside.png");

    await fs.writeFile(outsideFile, "img");

    const service = new FileSystemLibraryImageService(downloadsRoot);
    const result = await service.resolveImage(outsideFile);

    expect(result).toEqual({ kind: "reject", reason: "outside-root" });
  });

  it("rejects path traversal attempts", async () => {
    const downloadsRoot = await makeTempDir("lib-img-root-");
    const outsideRoot = await makeTempDir("lib-img-out-");
    const outsideFile = path.join(outsideRoot, "outside.png");

    await fs.writeFile(outsideFile, "img");

    const traversalPath = path.join(downloadsRoot, "..", path.basename(outsideRoot), "outside.png");
    const service = new FileSystemLibraryImageService(downloadsRoot);
    const result = await service.resolveImage(traversalPath);

    expect(result).toEqual({ kind: "reject", reason: "outside-root" });
  });

  it("rejects symlink escapes", async () => {
    const downloadsRoot = await makeTempDir("lib-img-root-");
    const outsideRoot = await makeTempDir("lib-img-out-");
    const outsideFile = path.join(outsideRoot, "outside.webp");
    const symlinkPath = path.join(downloadsRoot, "escape.webp");

    await fs.writeFile(outsideFile, "img");
    await fs.symlink(outsideFile, symlinkPath);

    const service = new FileSystemLibraryImageService(downloadsRoot);
    const result = await service.resolveImage(symlinkPath);

    expect(result).toEqual({ kind: "reject", reason: "outside-root" });
  });

  it("rejects non-image extension", async () => {
    const downloadsRoot = await makeTempDir("lib-img-root-");
    const filePath = path.join(downloadsRoot, "cover.txt");

    await fs.writeFile(filePath, "txt");

    const service = new FileSystemLibraryImageService(downloadsRoot);
    const result = await service.resolveImage(filePath);

    expect(result).toEqual({ kind: "reject", reason: "bad-extension" });
  });

  it("rejects missing path", async () => {
    const downloadsRoot = await makeTempDir("lib-img-root-");
    const service = new FileSystemLibraryImageService(downloadsRoot);
    const result = await service.resolveImage(undefined);

    expect(result).toEqual({ kind: "reject", reason: "missing-path" });
  });

  it("rejects files that do not exist", async () => {
    const downloadsRoot = await makeTempDir("lib-img-root-");
    const missingPath = path.join(downloadsRoot, "missing.png");
    const service = new FileSystemLibraryImageService(downloadsRoot);
    const result = await service.resolveImage(missingPath);

    expect(result).toEqual({ kind: "reject", reason: "not-found" });
  });

  it("logs warning with reason category for rejected requests", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const downloadsRoot = await makeTempDir("lib-img-root-");
    const service = new FileSystemLibraryImageService(downloadsRoot);

    const result = await service.resolveImage(undefined);

    expect(result).toEqual({ kind: "reject", reason: "missing-path" });
    expect(warnSpy).toHaveBeenCalledWith("[LibraryImageService] Request rejected", {
      reason: "missing-path",
    });
    expect(JSON.stringify(warnSpy.mock.calls[0])).not.toContain(downloadsRoot);
  });
});
