import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { trackService } = container;

// GET /api/track/playlist/:id - Get all tracks by playlist
router.get(
  "/playlist/:id",
  asyncHandler(async (req, res) => {
    const playlistId = req.params.id;
    const tracks = await trackService.getAllByPlaylist(playlistId);
    res.json({ data: tracks });
  }),
);

// DELETE /api/track/:id - Delete track
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await trackService.remove(id);
    res.status(204).send();
  }),
);

// GET /api/track/retry/:id - Retry track download
router.get(
  "/retry/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await trackService.retry(id);
    res.status(204).send();
  }),
);

export default router;
