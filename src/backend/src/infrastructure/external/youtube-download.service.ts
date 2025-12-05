import { SUPPORTED_AUDIO_FORMATS, SupportedAudioFormat, type ITrack } from "@spotiarr/shared";
import { YtDlp } from "ytdlp-nodejs";
import { SettingsService } from "../../application/services/settings.service";
import { YoutubeSearchService } from "./youtube-search.service";

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

export class YoutubeDownloadService {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly searchService: YoutubeSearchService,
  ) {}

  async downloadAndFormat(track: ITrack, output: string): Promise<void> {
    console.debug(`Downloading ${track.artist} - ${track.name} (${track.youtubeUrl}) from YT`);
    if (!track.youtubeUrl) {
      console.error("youtubeUrl is null or undefined");
      throw Error("youtubeUrl is null or undefined");
    }

    const ytdlp = new YtDlp({
      binaryPath: this.searchService.getYtDlpPath(),
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
}
