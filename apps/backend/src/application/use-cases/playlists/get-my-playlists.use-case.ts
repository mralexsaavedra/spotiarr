import { SpotifyPlaylist } from "@spotiarr/shared";
import { SpotifyService } from "@/application/services/spotify.service";

export class GetMyPlaylistsUseCase {
  constructor(private readonly spotifyService: SpotifyService) {}

  async execute(): Promise<SpotifyPlaylist[]> {
    return this.spotifyService.getMyPlaylists();
  }
}
