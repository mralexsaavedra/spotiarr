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
});
