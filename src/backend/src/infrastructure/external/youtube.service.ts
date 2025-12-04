import { SUPPORTED_AUDIO_FORMATS, SupportedAudioFormat, type ITrack } from "@spotiarr/shared";
import { execFile, execSync } from "child_process";
import * as fs from "fs";
import * as NodeID3 from "node-id3";
import * as os from "os";
import { join } from "path";
import { promisify } from "util";
import { YtDlp } from "ytdlp-nodejs";
import { SettingsService } from "../../application/services/settings.service";

const execFilePromise = promisify(execFile);

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
  constructor(private readonly settingsService: SettingsService) {
    // Auto-detect yt-dlp path from system PATH
    try {
      const systemPath = execSync("which yt-dlp", {
        encoding: "utf-8",
      }).trim();

      // WORKAROUND: ytdlp-nodejs tries to chmod the binary, which fails for /usr/bin/yt-dlp in Docker
      // We copy it to a local writable path (tmp dir) so the library can do its thing
      const localPath = join(os.tmpdir(), "yt-dlp");

      // Only copy if it doesn't exist or is different (simple check)
      if (!fs.existsSync(localPath)) {
        console.debug(`Copying system yt-dlp to ${localPath} to avoid permission issues`);
        fs.copyFileSync(systemPath, localPath);
        fs.chmodSync(localPath, 0o755);
      }

      this.ytDlpPath = localPath;
      console.debug(`Using yt-dlp from: ${this.ytDlpPath}`);
    } catch (e) {
      console.warn("yt-dlp not found in PATH, will try default 'yt-dlp' command", e);
      this.ytDlpPath = "yt-dlp";
    }
  }

  async findOnYoutubeOne(artist: string, name: string): Promise<string> {
    console.debug(`Searching ${artist} - ${name} on YT`);

    const args = [
      "--print",
      "webpage_url",
      `ytsearch1:${artist} - ${name}`,
      "--no-warnings",
      "--no-playlist",
      "--user-agent",
      HEADERS["User-Agent"],
    ];

    if (process.env["YT_COOKIES"]) {
      args.push("--cookies-from-browser", process.env["YT_COOKIES"]);
    }

    try {
      const { stdout } = await execFilePromise(this.ytDlpPath, args);
      const url = stdout.trim();

      if (!url) {
        throw new Error("No results found");
      }

      console.debug(`Found ${artist} - ${name} on ${url}`);
      return url;
    } catch (error) {
      console.error(`Error searching ${artist} - ${name} with yt-dlp:`, error);
      throw error;
    }
  }

  async downloadAndFormat(track: ITrack, output: string): Promise<void> {
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
