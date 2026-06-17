import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ArtworkAssetsService } from "./artwork-assets.service";

describe("ArtworkAssetsService", () => {
  const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff]);
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "artwork-assets-"));
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => jpegBuffer,
      }),
    );
  });

  afterEach(async () => {
    vi.unstubAllGlobals();
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("deduplicates repeated image downloads by URL", async () => {
    const service = new ArtworkAssetsService();

    await service.downloadImage("https://image.test/cover.jpg");
    await service.downloadImage("https://image.test/cover.jpg");

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("evicts the oldest cached download when the cache is full", async () => {
    const service = new ArtworkAssetsService();

    for (let index = 0; index < 51; index += 1) {
      await service.downloadImage(`https://image.test/${index}.jpg`);
    }

    await service.downloadImage("https://image.test/0.jpg");

    expect(fetch).toHaveBeenCalledTimes(52);
  });

  it("writes files once and keeps existing content", async () => {
    const service = new ArtworkAssetsService();
    const filePath = path.join(tmpDir, "Artist", "cover.jpg");
    const originalBuffer = Buffer.from("first");
    const ignoredBuffer = Buffer.from("second");

    await service.writeFileIfMissing(filePath, originalBuffer);
    await service.writeFileIfMissing(filePath, ignoredBuffer);

    await expect(access(filePath)).resolves.toBeUndefined();
    await expect(readFile(filePath)).resolves.toEqual(originalBuffer);
  });

  it("returns null immediately for an empty URL without fetching", async () => {
    const service = new ArtworkAssetsService();

    const result = await service.downloadImage("");

    expect(result).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns null when the fetch response is not ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        arrayBuffer: async () => new ArrayBuffer(0),
      }),
    );
    const service = new ArtworkAssetsService();

    const result = await service.downloadImage("https://image.test/missing.jpg");

    expect(result).toBeNull();
  });

  it("returns null when fetch throws a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network failure")));
    const service = new ArtworkAssetsService();

    const result = await service.downloadImage("https://image.test/error.jpg");

    expect(result).toBeNull();
  });

  it("moves a cache-hit URL to most-recent so it survives the next eviction", async () => {
    const service = new ArtworkAssetsService();

    // Seed URL-B first (oldest), then URL-A second.
    await service.downloadImage("https://image.test/b.jpg");
    await service.downloadImage("https://image.test/a.jpg");

    // Re-access URL-B — promotes it past A so A becomes the new oldest entry.
    await service.downloadImage("https://image.test/b.jpg");

    // Fill the remaining 48 slots so the cache holds exactly 50 entries.
    for (let index = 2; index <= 49; index += 1) {
      await service.downloadImage(`https://image.test/${index}.jpg`);
    }

    // Adding the 51st unique entry triggers one eviction.
    // A is the oldest (B was promoted past it), so A must be the one evicted.
    await service.downloadImage("https://image.test/51.jpg");

    // A must be gone — re-downloading it must trigger a new fetch.
    const fetchCallsBefore = (fetch as ReturnType<typeof vi.fn>).mock.calls.length;
    await service.downloadImage("https://image.test/a.jpg");
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls.length).toBe(fetchCallsBefore + 1);
  });

  it("forces a fresh fetch after clearCache", async () => {
    const service = new ArtworkAssetsService();
    const url = "https://image.test/cover.jpg";

    await service.downloadImage(url);
    service.clearCache();
    await service.downloadImage(url);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("rethrows errors from writeFileIfMissing that are not EEXIST", async () => {
    const service = new ArtworkAssetsService();
    // Place a regular file where a directory is expected so mkdir throws ENOTDIR.
    // That error is not caught by writeFileIfMissing (only writeFile errors are
    // caught), so it propagates out as a rejected promise.
    const blockFile = path.join(tmpDir, "block");
    await service.writeFileIfMissing(blockFile, Buffer.from("i am a file"));
    const filePath = path.join(blockFile, "image.jpg");

    await expect(service.writeFileIfMissing(filePath, Buffer.from("data"))).rejects.toThrow();
  });
});
