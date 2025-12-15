import type { PlaylistPreview } from "@spotiarr/shared";
import { SpotifyService } from "@/domain/services/spotify.service";

export class GetPlaylistPreviewUseCase {
  constructor(private readonly spotifyService: SpotifyService) {}

  async execute(spotifyUrl: string): Promise<PlaylistPreview> {
    const details = await this.spotifyService.getPlaylistDetail(spotifyUrl);

    return {
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
      totalTracks: details.tracks.length,
      owner: details.owner,
      ownerUrl: details.ownerUrl,
    };
  }
}
