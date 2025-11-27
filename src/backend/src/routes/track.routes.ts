import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { PrismaTrackRepository } from "../repositories/prisma-track.repository";
import { TrackService } from "../services/track.service";

const router: ExpressRouter = Router();
const trackRepository = new PrismaTrackRepository();
const trackService = new TrackService();

// GET /api/track/playlist/:id - Get all tracks by playlist
router.get(
  "/playlist/:id",
  asyncHandler(async (req, res) => {
    const playlistId = req.params.id;
    const tracks = await trackRepository.findAllByPlaylist(playlistId);
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
