import { Injectable, Logger } from '@nestjs/common';
import { TrackEntity } from '../track/track.entity';
import { EnvironmentEnum } from '../environmentEnum';
import { TrackService } from '../track/track.service';
import { ConfigService } from '@nestjs/config';
import { YtDlp } from 'ytdlp-nodejs';
import * as yts from 'yt-search';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const NodeID3 = require('node-id3');
import * as fs from 'fs';
import { dirname, join } from 'path';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(TrackService.name);

  constructor(private readonly configService: ConfigService) {}

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
    const ytdlp = new YtDlp();
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
  ): Promise<void> {
    if (coverUrl) {
      const res = await fetch(coverUrl);
      const arrayBuf = await res.arrayBuffer();
      const imageBuffer = Buffer.from(arrayBuf);

      NodeID3.write(
        {
          title,
          artist,
          APIC: {
            mime: 'image/jpeg',
            type: { id: 3, name: 'front cover' },
            description: 'cover',
            imageBuffer,
          },
        },
        folderName,
      );
    }
  }

  /**
   * Saves cover art in the specified directory for Jellyfin detection
   * Jellyfin looks for: cover.jpg, folder.jpg
   * Downloads the image only if it doesn't exist yet
   */
  async saveCoverArt(directory: string, coverUrl: string): Promise<void> {
    if (!coverUrl) {
      return;
    }

    try {
      // Cover files that Jellyfin recognizes
      const coverFiles = [
        join(directory, 'cover.jpg'), // Priority 1 for Jellyfin
        join(directory, 'folder.jpg'), // Alternative
      ];

      // Only download if none of the files exist
      const coverExists = coverFiles.some((file) => fs.existsSync(file));
      if (coverExists) {
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

      // Save both files for compatibility
      for (const coverFile of coverFiles) {
        fs.writeFileSync(coverFile, imageBuffer);
      }

      this.logger.log(`✓ Cover art saved in ${directory}`);
    } catch (error) {
      this.logger.error(`Failed to save cover art in ${directory}: ${error.message}`);
    }
  }
}
