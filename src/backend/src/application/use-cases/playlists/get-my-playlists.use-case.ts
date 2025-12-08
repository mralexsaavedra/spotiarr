import { SpotifyPlaylist } from "@spotiarr/shared";
import { SpotifyService } from "../../../infrastructure/external/spotify.service";

export class GetMyPlaylistsUseCase {
  constructor(private readonly spotifyService: SpotifyService) {}

  async execute(): Promise<SpotifyPlaylist[]> {
    return this.spotifyService.getMyPlaylists();
  }
}
