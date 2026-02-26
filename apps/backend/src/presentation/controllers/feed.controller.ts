import { Request, Response } from "express";
import { SpotifyUserLibraryService } from "@/infrastructure/external/spotify-user-library.service";

export class FeedController {
  constructor(private readonly spotifyUserLibraryService: SpotifyUserLibraryService) {}

  getRecentReleases = async (_req: Request, res: Response) => {
    const releases = await this.spotifyUserLibraryService.getFollowedArtistsRecentReleases();
    res.json(releases);
  };

  getArtists = async (_req: Request, res: Response) => {
    const artists = await this.spotifyUserLibraryService.getFollowedArtists();
    res.json(artists);
  };
}
