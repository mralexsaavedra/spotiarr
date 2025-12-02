import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { SpotifyApiService } from "../services/spotify-api.service";

const router: ExpressRouter = Router();
const spotifyApiService = SpotifyApiService.getInstance();

// GET /api/feed/releases - Get recent releases from followed artists
router.get(
  "/releases",
  asyncHandler(async (_req, res) => {
    try {
      const releases = await spotifyApiService.getFollowedArtistsRecentReleases();
      res.json(releases);
    } catch (error) {
      const err = error as Error & { code?: string };

      if (err.code === "MISSING_SPOTIFY_USER_TOKEN") {
        return res.status(400).json({ error: "missing_user_access_token" });
      }

      if (err.code === "SPOTIFY_RATE_LIMITED") {
        return res.status(503).json({ error: "spotify_rate_limited" });
      }

      console.error("Error getting feed releases", err.message);
      return res.status(500).json({ error: "failed_to_fetch_releases" });
    }
  }),
);

// GET /api/feed/artists - Get followed artists list
router.get(
  "/artists",
  asyncHandler(async (_req, res) => {
    try {
      const artists = await spotifyApiService.getFollowedArtists();
      res.json(artists);
    } catch (error) {
      const err = error as Error & { code?: string };

      if (err.code === "MISSING_SPOTIFY_USER_TOKEN") {
        return res.status(400).json({ error: "missing_user_access_token" });
      }

      if (err.code === "SPOTIFY_RATE_LIMITED") {
        return res.status(503).json({ error: "spotify_rate_limited" });
      }

      console.error("Error getting followed artists", err.message);
      return res.status(500).json({ error: "failed_to_fetch_followed_artists" });
    }
  }),
);

export default router;
