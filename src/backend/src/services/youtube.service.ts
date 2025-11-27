import { SUPPORTED_AUDIO_FORMATS, SupportedAudioFormat } from "@spotiarr/shared";
import { execSync } from "child_process";
import * as fs from "fs";
import * as NodeID3 from "node-id3";
import { join } from "path";
import { YtDlp } from "ytdlp-nodejs";
import { TrackEntity } from "../entities/track.entity";
import { SettingsService } from "./settings.service";

// eslint-disable-next-line @typescript-eslint/no-require-imports
import yts = require("yt-search");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

interface CoverTags extends NodeID3.Tags {
  APIC?: {
    mime: string;
    type: { id: number; name: string };
    description: string;
    imageBuffer: Buffer;
  };
}

export class YoutubeService {
  private readonly ytDlpPath: string;
  private readonly settingsService: SettingsService;

  constructor() {
    // Auto-detect yt-dlp path from system PATH
    try {
      this.ytDlpPath = execSync("which yt-dlp", {
        encoding: "utf-8",
      }).trim();
      console.debug(`Using yt-dlp from: ${this.ytDlpPath}`);
    } catch {
      console.warn("yt-dlp not found in PATH, will try default location");
      this.ytDlpPath = "yt-dlp";
    }
    this.settingsService = new SettingsService();
  }

  async findOnYoutubeOne(artist: string, name: string): Promise<string> {
    console.debug(`Searching ${artist} - ${name} on YT`);
    const results = await yts(`${artist} - ${name}`);
    const url = results.videos[0].url;
    console.debug(`Found ${artist} - ${name} on ${url}`);
    return url;
  }

  async downloadAndFormat(track: TrackEntity, output: string): Promise<void> {
    console.debug(`Downloading ${track.artist} - ${track.name} (${track.youtubeUrl}) from YT`);
    if (!track.youtubeUrl) {
      console.error("youtubeUrl is null or undefined");
      throw Error("youtubeUrl is null or undefined");
    }
    const ytdlp = new YtDlp({
      binaryPath: this.ytDlpPath,
    });

    // Get format from settings with fallback to 'mp3'
    const configuredFormat = await this.settingsService.getString("FORMAT");
    const formatType = (
      SUPPORTED_AUDIO_FORMATS.includes(configuredFormat as SupportedAudioFormat)
        ? configuredFormat
        : "mp3"
    ) as SupportedAudioFormat;

    const audioQuality = await this.settingsService.getString("YT_AUDIO_QUALITY");
    const qualityMap: Record<string, 0 | 5 | 9> = {
      best: 0,
      good: 5,
      acceptable: 9,
    };
    const quality = (qualityMap[audioQuality] ?? 0) as 0 | 5 | 9;

    await ytdlp.downloadAsync(track.youtubeUrl, {
      format: {
        filter: "audioonly",
        type: formatType,
        quality,
      },
      output,
      cookiesFromBrowser: process.env["YT_COOKIES"],
      headers: HEADERS,
    });
    console.debug(`Downloaded ${track.artist} - ${track.name} to ${output}`);
  }

  async addImage(
    folderName: string,
    coverUrl: string,
    title: string,
    artist: string,
    albumYear?: number,
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

      NodeID3.write(tags, folderName);
    }
  }

  /**
   * Saves cover art in the specified directory for Jellyfin detection
   * Jellyfin looks for: cover.jpg
   * Downloads the image only if it doesn't exist yet
   */
  async saveCoverArt(directory: string, coverUrl: string): Promise<void> {
    if (!coverUrl) {
      return;
    }

    try {
      const coverFile = join(directory, "cover.jpg");

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
