import type { PlaylistPreview } from "@spotiarr/shared";
import { SpotifyService } from "@/domain/services/spotify.service";

interface PlaylistPreviewTracksPage {
  tracks: PlaylistPreview["tracks"];
  total: number;
  hasMore: boolean;
  nextOffset: number | null;
}

export class GetPlaylistPreviewTracksPageUseCase {
  constructor(private readonly spotifyService: SpotifyService) {}

  async execute(
    spotifyUrl: string,
    offset: number,
    limit: number,
  ): Promise<PlaylistPreviewTracksPage> {
    const page = await this.spotifyService.getPlaylistTracksPage(spotifyUrl, offset, limit);

    return {
      tracks: page.tracks.map((track) => ({
        name: track.name,
        artists: track.artists?.map((a) => ({ name: a.name, url: a.url })) || [
          { name: track.artist, url: undefined },
        ],
        album: track.album || "Unknown Album",
        duration: track.durationMs || 0,
        trackUrl: track.trackUrl,
        albumUrl: track.albumUrl,
      })),
      total: page.total,
      hasMore: page.hasMore,
      nextOffset: page.nextOffset,
    };
  }
}
