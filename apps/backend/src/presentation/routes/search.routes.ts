import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { spotifyService } = container;

// GET /api/search?q=<query>&types=track,album,artist
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const query = req.query.q as string;

    if (!query) {
      res.json({ data: { tracks: [], albums: [], artists: [] } });
      return;
    }

    const typesStr = req.query.types as string;
    const types = typesStr ? typesStr.split(",") : ["track", "album", "artist"];
    const limit = parseInt(req.query.limit as string) || 20;

    // Per-type limits: if requesting a specific tab (single type), use the full limit (e.g. 20)
    // If requesting "All" (multiple types), cap artists low to avoid unrelated results
    const limits =
      types.length === 1
        ? { track: limit, album: limit, artist: limit }
        : {
            track: 10,
            album: 10,
            artist: 5,
          };

    const results = await spotifyService.searchCatalog(query, types, limits);
    res.json({ data: results });
  }),
);

export default router;
