import { Request, Response } from "express";
import type { FeedRepositoryPort } from "@/application/ports/feed-repository.port";
import type { SpotifyUserLibraryPort } from "@/application/ports/spotify-user-library.port";
import { GetRecentReleasesUseCase } from "@/application/use-cases/feed/get-recent-releases.use-case";

export class FeedController {
  constructor(
    private readonly spotifyUserLibraryService: SpotifyUserLibraryPort,
    private readonly feedRepository: FeedRepositoryPort,
    private readonly getRecentReleasesUseCase: GetRecentReleasesUseCase,
  ) {}

  getRecentReleases = async (_req: Request, res: Response) => {
    const releases = await this.getRecentReleasesUseCase.execute();
    res.json(releases);
  };

  getArtists = async (_req: Request, res: Response) => {
    let artists = await this.feedRepository.getArtists();

    if (artists.length === 0) {
      artists = await this.spotifyUserLibraryService.getFollowedArtists();
    }

    res.json(artists);
  };
}
