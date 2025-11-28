import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { SpotifyApiService } from "../services/spotify-api.service";

const router: ExpressRouter = Router();
const spotifyApiService = new SpotifyApiService();

// GET /api/artist/:id - Artist detail (metadata + top tracks)
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: "missing_artist_id" });
    }

    try {
      const [details, topTracks] = await Promise.all([
        spotifyApiService.getArtistDetails(id),
        spotifyApiService.getArtistTopTracks(id),
      ]);

      return res.json({
        id,
        name: details.name,
        image: details.image,
        spotifyUrl: details.spotifyUrl,
        topTracks,
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

export default router;
