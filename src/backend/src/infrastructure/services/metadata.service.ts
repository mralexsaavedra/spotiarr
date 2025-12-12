import * as fs from "fs";
import * as NodeID3 from "node-id3";
import { join } from "path";
import { AppError } from "@/domain/errors/app-error";
import { getErrorMessage } from "../utils/error.utils";

export class MetadataService {
  async writeTags(
    folderName: string,
    fileTags: {
      title: string;
      artist: string;
      album?: string;
      albumYear?: number;
      trackNumber?: number;
      discNumber?: number;
      totalTracks?: number;
      coverUrl?: string; // Optional: download and embed if present
    },
  ): Promise<void> {
    const { title, artist, album, albumYear, trackNumber, discNumber, totalTracks, coverUrl } =
      fileTags;

    const tags: NodeID3.Tags = {
      title,
      artist,
      performerInfo: artist, // Album Artist - crucial for Jellyfin grouping
    };

    if (album) {
      tags.album = album;
    }

    if (albumYear) {
      tags.year = albumYear.toString();
    }

    if (trackNumber) {
      tags.trackNumber = totalTracks ? `${trackNumber}/${totalTracks}` : trackNumber.toString();
    }

    if (discNumber) {
      tags.partOfSet = discNumber.toString();
    }

    if (coverUrl) {
      try {
        const res = await fetch(coverUrl);
        const arrayBuf = await res.arrayBuffer();
        const imageBuffer = Buffer.from(arrayBuf);

        tags.image = {
          mime: "image/jpeg",
          type: { id: 3, name: "front cover" }, // Cover (front)
          description: "cover",
          imageBuffer,
        };
      } catch (error) {
        console.warn(`Failed to download cover for embedding: ${getErrorMessage(error)}`);
      }
    }

    const success = NodeID3.write(tags, folderName);
    if (!success) {
      console.warn(`NodeID3.write returned false for ${folderName}`);
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
        throw new AppError(
          500,
          "internal_server_error",
          `Failed to download cover: ${response.statusText}`,
        );
      }

      const fileStream = fs.createWriteStream(coverFile);

      // Use standard stream piping if available, or manual writing
      // For fetch response.body (web stream), we need to iterate
      if (response.body) {
        const reader = response.body.getReader();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fileStream.write(value);
        }

        fileStream.end();

        // Wait for finish
        await new Promise<void>((resolve, reject) => {
          fileStream.on("finish", () => resolve());
          fileStream.on("error", reject);
        });
      } else {
        // Fallback for unlikely case
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(coverFile, buffer);
      }

      // Force permissions to be readable by everyone (rw-rw-rw-)
      try {
        // Small delay to ensure file lock is released
        await new Promise((r) => setTimeout(r, 100));
        fs.chmodSync(coverFile, 0o666);
      } catch (e) {
        console.warn(`Could not set permissions for ${coverFile}: ${getErrorMessage(e)}`);
      }

      console.debug(`✓ Cover art saved in ${directory}`);
    } catch (error) {
      console.error(`Failed to save cover art in ${directory}: ${getErrorMessage(error)}`);
    }
  }
}
