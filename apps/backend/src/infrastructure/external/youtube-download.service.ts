import {
  DEFAULT_AUDIO_FORMAT,
  SUPPORTED_AUDIO_FORMATS,
  type ITrack,
  type SupportedAudioFormat,
} from "@spotiarr/shared";
import { YtDlp } from "ytdlp-nodejs";
import type { SettingsPort } from "@/application/ports/settings.port";
import type { YoutubeDownloadResult } from "@/application/ports/youtube.port";
import { AppError } from "@/domain/errors/app-error";
import type { YoutubeSearchService } from "./youtube-search.service";
import { YOUTUBE_HEADERS } from "./youtube.constants";

export class YoutubeDownloadService {
  constructor(
    private readonly settingsService: SettingsPort,
    private readonly searchService: YoutubeSearchService,
  ) {}

  async downloadAndFormat(track: ITrack, output: string): Promise<YoutubeDownloadResult> {
    console.debug(`Downloading ${track.artist} - ${track.name} (${track.youtubeUrl}) from YT`);
    if (!track.youtubeUrl) {
      console.error("youtubeUrl is null or undefined");
      throw new AppError(400, "internal_server_error", "youtubeUrl is null or undefined");
    }

    const ytdlp = new YtDlp({
      binaryPath: this.searchService.getYtDlpPath(),
    });

    const configuredFormat = await this.settingsService.getString("FORMAT");
    const formatType = (
      SUPPORTED_AUDIO_FORMATS.includes(configuredFormat as SupportedAudioFormat)
        ? configuredFormat
        : DEFAULT_AUDIO_FORMAT
    ) as SupportedAudioFormat;

    const audioQuality = await this.settingsService.getString("YT_AUDIO_QUALITY");
    const qualityMap: Record<string, 0 | 5 | 9> = {
      best: 0,
      good: 5,
      acceptable: 9,
    };
    const quality = (qualityMap[audioQuality] ?? 0) as 0 | 5 | 9;

    // Get cookies browser from settings
    const ytCookies = await this.settingsService.getString("YT_COOKIES");
    const isCookieFile = ytCookies && (ytCookies.includes("/") || ytCookies.endsWith(".txt"));

    await ytdlp.downloadAsync(track.youtubeUrl, {
      format: {
        filter: "audioonly",
        type: formatType,
        quality,
      },
      output,
      cookies: isCookieFile ? ytCookies : undefined,
      cookiesFromBrowser: !isCookieFile && ytCookies ? ytCookies : undefined,
      headers: YOUTUBE_HEADERS,
    });
    console.debug(`Downloaded ${track.artist} - ${track.name} to ${output}`);

    return { durationMs: await this.resolveDurationMs(ytdlp, track.youtubeUrl) };
  }

  private async resolveDurationMs(ytdlp: YtDlp, youtubeUrl: string): Promise<number | undefined> {
    try {
      const info = await ytdlp.getInfoAsync(youtubeUrl);
      const seconds = (info as { duration?: unknown }).duration;
      return typeof seconds === "number" && seconds > 0 ? Math.round(seconds * 1000) : undefined;
    } catch (err) {
      console.debug(`Could not resolve duration for ${youtubeUrl}: ${String(err)}`);
      return undefined;
    }
  }
}
