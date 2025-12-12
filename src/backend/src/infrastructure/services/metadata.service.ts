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

      const imageBuffer = Buffer.from(await response.arrayBuffer());

      // Save file
      fs.writeFileSync(coverFile, imageBuffer);

      console.debug(`✓ Cover art saved: ${coverFile}`);
    } catch (error) {
      console.warn(`Failed to save cover art in ${directory}: ${getErrorMessage(error)}`);
    }
  }
}
