import { parseFile } from "music-metadata";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ArtworkBackfillEmbeddedSourcePort } from "@/application/ports/artwork-backfill-sources.port";

export class EmbeddedArtworkSourceService implements ArtworkBackfillEmbeddedSourcePort {
  async extractFromTracks(trackPaths: string[]): Promise<string | null> {
    for (const trackPath of trackPaths) {
      try {
        const metadata = await parseFile(trackPath, { duration: false, skipCovers: false });
        const picture = metadata.common.picture?.find((candidate) => candidate.data?.length);
        if (!picture) {
          continue;
        }

        const extension = this.getExtension(picture.format);
        if (!extension) {
          continue;
        }

        const fileName = `${createHash("sha1").update(trackPath).digest("hex")}${extension}`;
        const outputPath = join(tmpdir(), "spotiarr-artwork-backfill", fileName);
        await mkdir(join(tmpdir(), "spotiarr-artwork-backfill"), { recursive: true });
        await writeFile(outputPath, picture.data);
        return `file://${outputPath}`;
      } catch {
        continue;
      }
    }

    return null;
  }

  private getExtension(format: string | undefined): ".jpg" | ".png" | ".webp" | null {
    const normalized = format?.trim().toLowerCase();
    if (normalized === "image/jpeg" || normalized === "image/jpg") return ".jpg";
    if (normalized === "image/png") return ".png";
    if (normalized === "image/webp") return ".webp";
    return null;
  }
}
