import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import type { ArtworkAssetsPort } from "@/application/ports/artwork-assets.port";

const MAX_IMAGE_CACHE_ENTRIES = 50;

export class ArtworkAssetsService implements ArtworkAssetsPort {
  private readonly imageCache = new Map<string, Promise<Buffer | null>>();

  async downloadImage(url: string): Promise<Buffer | null> {
    if (!url) {
      return null;
    }

    const cached = this.imageCache.get(url);
    if (cached) {
      this.imageCache.delete(url);
      this.imageCache.set(url, cached);
      return cached;
    }

    const downloadPromise = (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          return null;
        }

        return Buffer.from(await response.arrayBuffer());
      } catch {
        return null;
      }
    })();

    this.imageCache.set(url, downloadPromise);
    this.evictIfNeeded();
    return downloadPromise;
  }

  async writeFileIfMissing(filePath: string, content: Buffer): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });

    try {
      await writeFile(filePath, content, { flag: "wx" });
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        return;
      }

      throw error;
    }
  }

  clearCache(): void {
    this.imageCache.clear();
  }

  private evictIfNeeded(): void {
    while (this.imageCache.size > MAX_IMAGE_CACHE_ENTRIES) {
      const oldestKey = this.imageCache.keys().next().value;
      if (!oldestKey) {
        return;
      }

      this.imageCache.delete(oldestKey);
    }
  }
}
