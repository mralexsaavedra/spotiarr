import { Request, Response } from "express";
import { SpotifyService } from "@/domain/services/spotify.service";

export class SearchController {
  constructor(private readonly spotifyService: SpotifyService) {}

  searchCatalog = async (req: Request, res: Response) => {
    const query = req.query.q as string;

    if (!query) {
      res.json({ data: { tracks: [], albums: [], artists: [] } });
      return;
    }

    const typesStr = req.query.types as string;
    const types = typesStr ? typesStr.split(",") : ["track", "album", "artist"];
    const requestedLimit = Number.parseInt(req.query.limit as string, 10);
    const safeLimit = Number.isNaN(requestedLimit) ? 10 : requestedLimit;
    const limit = Math.max(1, Math.min(safeLimit, 10));

    const limits =
      types.length === 1
        ? { track: limit, album: limit, artist: limit }
        : {
            track: limit,
            album: limit,
            artist: limit,
          };

    const results = await this.spotifyService.searchCatalog(query, types, limits);
    res.json({ data: results });
  };
}
