import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { spotifyCatalogService } = container;

// GET /api/artist/:id - Artist detail (metadata + top tracks)
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "missing_artist_id" });
    }

    const limit = parseInt(req.query.limit as string) || 12;

    try {
      const [details, topTracks, albums] = await Promise.all([
        spotifyCatalogService.getArtistDetails(id),
        spotifyCatalogService.getArtistTopTracks(id),
        spotifyCatalogService.getArtistAlbums(id, limit),
      ]);

      return res.json({
        id,
        name: details.name,
        image: details.image,
        spotifyUrl: details.spotifyUrl,
        followers: details.followers,
        popularity: details.popularity,
        genres: details.genres,
        topTracks,
        albums,
      });
    } catch (error) {
      const err = error as Error & { code?: string; status?: number };

      if (err.code === "MISSING_SPOTIFY_USER_TOKEN") {
        return res.status(400).json({ error: "missing_user_access_token" });
      }

      if (err.code === "SPOTIFY_RATE_LIMITED") {
        return res.status(503).json({ error: "spotify_rate_limited" });
      }

      console.error("Error getting artist detail", err.message);
      return res.status(500).json({ error: "failed_to_fetch_artist_detail" });
    }
  }),
);

// GET /api/artist/:id/albums - Artist albums (paginated)
router.get(
  "/:id/albums",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!id) {
      return res.status(400).json({ error: "missing_artist_id" });
    }

    try {
      const albums = await spotifyCatalogService.getArtistAlbums(id, limit, offset);
      return res.json(albums);
    } catch (error) {
      console.error("Error getting artist albums", (error as Error).message);
      return res.status(500).json({ error: "failed_to_fetch_artist_albums" });
    }
  }),
);

export default router;
