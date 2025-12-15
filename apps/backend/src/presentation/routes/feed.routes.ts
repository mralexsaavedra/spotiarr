import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { spotifyUserLibraryService } = container;

// GET /api/feed/releases - Get recent releases from followed artists
router.get(
  "/releases",
  asyncHandler(async (_req, res) => {
    const releases = await spotifyUserLibraryService.getFollowedArtistsRecentReleases();
    res.json(releases);
  }),
);

// GET /api/feed/artists - Get followed artists list
router.get(
  "/artists",
  asyncHandler(async (_req, res) => {
    const artists = await spotifyUserLibraryService.getFollowedArtists();
    res.json(artists);
  }),
);

export default router;
