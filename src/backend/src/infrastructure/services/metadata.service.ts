import * as fs from "fs";
import * as NodeID3 from "node-id3";
import { join } from "path";

interface CoverTags extends NodeID3.Tags {
  APIC?: {
    mime: string;
    type: { id: number; name: string };
    description: string;
    imageBuffer: Buffer;
  };
}

export class MetadataService {
  async addImage(
    folderName: string,
    coverUrl: string,
    title: string,
    artist: string,
    albumYear?: number,
    trackNumber?: number,
  ): Promise<void> {
    if (coverUrl) {
      const res = await fetch(coverUrl);
      const arrayBuf = await res.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuf);

      const tags: CoverTags = {
        title,
        artist,
        APIC: {
          mime: "image/jpeg",
          type: { id: 3, name: "front cover" },
          description: "cover",
          imageBuffer,
        },
      };

      // Add year if available
      if (albumYear) {
        tags.year = albumYear.toString();
      }

      // Add track number if available
      if (trackNumber) {
        tags.trackNumber = trackNumber.toString();
      }

      NodeID3.write(tags, folderName);
    }
  }

  /**
   * Saves cover art in the specified directory for Jellyfin detection
   * Jellyfin looks for: cover.jpg
   * Downloads the image only if it doesn't exist yet
   */
  async saveCoverArt(
    directory: string,
    coverUrl: string,
    fileName: string = "cover.jpg",
  ): Promise<void> {
    if (!coverUrl) {
      return;
    }

    try {
      const coverFile = join(directory, fileName);

      // Only download if the file doesn't exist
      if (fs.existsSync(coverFile)) {
        console.debug(`Cover art already exists in ${directory}`);
        return;
      }

      // Download the image
      console.debug(`Downloading cover art to ${directory}`);
      const response = await fetch(coverUrl);

      if (!response.ok) {
        throw new Error(`Failed to download cover: ${response.statusText}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());

      // Save cover.jpg
      fs.writeFileSync(coverFile, imageBuffer);

      console.debug(`✓ Cover art saved in ${directory}`);
    } catch (error) {
      console.error(`Failed to save cover art in ${directory}: ${(error as Error).message}`);
    }
  }
}
