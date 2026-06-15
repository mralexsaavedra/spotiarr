import type { ITrack } from "@spotiarr/shared";

export interface YoutubeDownloadResult {
  durationMs?: number;
}

export interface YoutubeDownloadPort {
  downloadAndFormat(track: ITrack, outputPath: string): Promise<YoutubeDownloadResult>;
}

export interface YoutubeSearchPort {
  findOnYoutubeOne(query: string, artist: string, duration?: number): Promise<string | null>;
}
