import type { PlaylistPreview } from "@spotiarr/shared";
import { SpotifyService } from "@/application/services/spotify.service";

export class GetPlaylistPreviewUseCase {
  constructor(private readonly spotifyService: SpotifyService) {}

  async execute(spotifyUrl: string): Promise<PlaylistPreview> {
    const details = await this.spotifyService.getPlaylistDetail(spotifyUrl, true);
    const totalTracks = await this.resolveTotalTracks(spotifyUrl, details);

    const result: PlaylistPreview = {
      name: details.name,
      type: details.type,
      description: null,
      coverUrl: details.image || null,
      tracks: details.tracks.map((track) => ({
        name: track.name,
        artists: track.artists?.map((a) => ({ name: a.name, url: a.url })) || [
          { name: track.artist, url: undefined },
        ],
        album: track.album || "Unknown Album",
        duration: track.durationMs || 0,
        trackUrl: track.trackUrl,
        albumUrl: track.albumUrl,
      })),
      totalTracks,
      owner: details.owner,
      ownerUrl: details.ownerUrl,
    };

    return result;
  }

  private async resolveTotalTracks(
    spotifyUrl: string,
    details: Awaited<ReturnType<SpotifyService["getPlaylistDetail"]>>,
  ): Promise<number> {
    const fallbackTotal = details.totalTracks ?? details.tracks.length;

    if (
      details.type !== "playlist" ||
      details.tracks.length !== 100
    ) {
      return fallbackTotal;
    }

    const firstPage = await this.spotifyService.getPlaylistTracksPage(
      spotifyUrl,
      0,
      details.tracks.length,
    );

    return firstPage.total > fallbackTotal ? firstPage.total : fallbackTotal;
  }
}
