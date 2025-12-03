import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import {
  createPlaylistSchema,
  playlistIdSchema,
  playlistPreviewSchema,
  updatePlaylistSchema,
} from "./schemas/playlist.schema";

const router: ExpressRouter = Router();
const { playlistService } = container;

// GET /api/playlist/preview - Get playlist preview from Spotify URL
router.get(
  "/preview",
  validate(playlistPreviewSchema),
  asyncHandler(async (req, res) => {
    const { url } = req.query as { url: string };
    const preview = await playlistService.getPreview(url);
    res.json(preview);
  }),
);

// GET /api/playlist/status - Get download status summary
router.get(
  "/status",
  asyncHandler(async (req, res) => {
    const status = await playlistService.getDownloadStatus();
    res.json(status);
  }),
);

// GET /api/playlist - Get all playlists
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const playlists = await playlistService.findAll();
    res.json({ data: playlists });
  }),
);

// POST /api/playlist - Create new playlist
router.post(
  "/",
  validate(createPlaylistSchema),
  asyncHandler(async (req, res) => {
    const playlist = await playlistService.create(req.body);
    res.status(201).json(playlist);
  }),
);

// PUT /api/playlist/:id - Update playlist
router.put(
  "/:id",
  validate(updatePlaylistSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await playlistService.update(id, req.body);
    res.status(204).send();
  }),
);

// DELETE /api/playlist/completed - Delete all completed playlists
router.delete(
  "/completed",
  asyncHandler(async (req, res) => {
    await playlistService.removeCompleted();
    res.status(204).send();
  }),
);

// DELETE /api/playlist/:id - Delete playlist
router.delete(
  "/:id",
  validate(playlistIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await playlistService.remove(id);
    res.status(204).send();
  }),
);

// GET /api/playlist/retry/:id - Retry failed tracks
router.get(
  "/retry/:id",
  validate(playlistIdSchema),
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    await playlistService.retryFailedOfPlaylist(id);
    res.status(204).send();
  }),
);

export default router;
