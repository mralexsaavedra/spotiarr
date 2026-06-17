import * as NodeID3 from "node-id3";
import { logger } from "@/infrastructure/logging/logger";

export class MetadataService {
  async writeTags(
    folderName: string,
    fileTags: {
      title: string;
      artist: string;
      albumArtist?: string;
      album?: string;
      albumYear?: number;
      trackNumber?: number;
      discNumber?: number;
      totalTracks?: number;
      coverBuffer?: Buffer;
    },
  ): Promise<void> {
    const {
      title,
      artist,
      albumArtist,
      album,
      albumYear,
      trackNumber,
      discNumber,
      totalTracks,
      coverBuffer,
    } = fileTags;

    const tags: NodeID3.Tags = {
      title,
      artist,
      performerInfo: albumArtist || artist, // Album Artist - crucial for Jellyfin grouping
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

    if (coverBuffer) {
      tags.image = {
        mime: "image/jpeg",
        type: { id: 3, name: "front cover" },
        description: "cover",
        imageBuffer: coverBuffer,
      };
    }

    const success = NodeID3.write(tags, folderName);
    if (!success) {
      logger.warn(
        { component: "metadata-service", filePath: folderName },
        "NodeID3.write returned false",
      );
    }
  }
}
