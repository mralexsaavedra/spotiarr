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

    const albums = await spotifyCatalogService.getArtistAlbums(id, limit, offset);
    return res.json(albums);
  }),
);

export default router;
