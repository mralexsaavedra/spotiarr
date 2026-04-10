import { Request, Response } from "express";
import { SpotifyArtistClient } from "@/infrastructure/external/spotify-artist.client";

export class ArtistController {
  constructor(private readonly spotifyArtistClient: SpotifyArtistClient) {}

  getArtistDetail = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "missing_artist_id" });
    }

    const limit = parseInt(req.query.limit as string) || 12;

    const [details, albums] = await Promise.all([
      this.spotifyArtistClient.getArtistDetails(id),
      this.spotifyArtistClient.getArtistAlbums(id, limit),
    ]);

    return res.json({
      id,
      name: details.name,
      image: details.image,
      spotifyUrl: details.spotifyUrl,
      followers: details.followers,
      genres: details.genres,
      albums,
    });
  };

  getArtistAlbums = async (req: Request, res: Response) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!id) {
      return res.status(400).json({ error: "missing_artist_id" });
    }

    const albums = await this.spotifyArtistClient.getArtistAlbums(id, limit, offset);
    return res.json(albums);
  };
}
