import { Injectable, Logger } from '@nestjs/common';
import { TrackEntity } from '../track/track.entity';
import { EnvironmentEnum } from '../environmentEnum';
import { TrackService } from '../track/track.service';
import { ConfigService } from '@nestjs/config';
import { YtDlp } from 'ytdlp-nodejs';
import * as yts from 'yt-search';
import * as fs from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const NodeID3 = require('node-id3');

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(TrackService.name);
  private readonly ytDlpPath: string;

  constructor(private readonly configService: ConfigService) {
    // Auto-detect yt-dlp path or use environment variable
    try {
      this.ytDlpPath =
        this.configService.get<string>('YT_DLP_PATH') ||
        execSync('which yt-dlp', { encoding: 'utf-8' }).trim();
      this.logger.log(`Using yt-dlp from: ${this.ytDlpPath}`);
    } catch (error) {
      this.logger.warn('yt-dlp not found in PATH, will try default location');
      this.ytDlpPath = 'yt-dlp';
    }
  }

  async findOnYoutubeOne(artist: string, name: string): Promise<string> {
    this.logger.debug(`Searching ${artist} - ${name} on YT`);
    const url = (await yts(`${artist} - ${name}`)).videos[0].url;
    this.logger.debug(`Found ${artist} - ${name} on ${url}`);
    return url;
  }

  async downloadAndFormat(track: TrackEntity, output: string): Promise<void> {
    this.logger.debug(
      `Downloading ${track.artist} - ${track.name} (${track.youtubeUrl}) from YT`,
    );
    if (!track.youtubeUrl) {
      this.logger.error('youtubeUrl is null or undefined');
      throw Error('youtubeUrl is null or undefined');
    }
    const ytdlp = new YtDlp({
      binaryPath: this.ytDlpPath,
    });
    await ytdlp.downloadAsync(track.youtubeUrl, {
      format: {
        filter: 'audioonly',
        type: this.configService.get<'m4a'>(EnvironmentEnum.FORMAT),
        quality: 0,
      },
      output,
      cookiesFromBrowser: this.configService.get<string>('YT_COOKIES'),
      headers: HEADERS,
    });
    this.logger.debug(
      `Downloaded ${track.artist} - ${track.name} to ${output}`,
    );
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

      const tags: any = {
        title,
        artist,
        APIC: {
          mime: 'image/jpeg',
          type: { id: 3, name: 'front cover' },
          description: 'cover',
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
      const coverFile = join(directory, 'cover.jpg');

      // Only download if the file doesn't exist
      if (fs.existsSync(coverFile)) {
        this.logger.debug(`Cover art already exists in ${directory}`);
        return;
      }

      // Download the image
      this.logger.debug(`Downloading cover art to ${directory}`);
      const response = await fetch(coverUrl);

      if (!response.ok) {
        throw new Error(`Failed to download cover: ${response.statusText}`);
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());

      // Save cover.jpg
      fs.writeFileSync(coverFile, imageBuffer);

      this.logger.log(`✓ Cover art saved in ${directory}`);
    } catch (error) {
      this.logger.error(
        `Failed to save cover art in ${directory}: ${error.message}`,
      );
    }
  }
}
