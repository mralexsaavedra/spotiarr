import type { ITrack } from "@spotiarr/shared";

export interface YoutubeDownloadPort {
  downloadAndFormat(track: ITrack, outputPath: string): Promise<void>;
}

export interface YoutubeSearchPort {
  findOnYoutubeOne(query: string, artist: string, duration?: number): Promise<string | null>;
}
