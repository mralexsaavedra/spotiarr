import { Router, type Router as ExpressRouter } from "express";
import { asyncHandler } from "../middleware/async-handler";
import { PlaylistService } from "../services/playlist.service";

const router: ExpressRouter = Router();
const playlistService = new PlaylistService();

// GET /api/playlist/preview - Get playlist preview from Spotify URL
router.get(
  "/preview",
  asyncHandler(async (req, res) => {
    const { url } = req.query;

    if (typeof url !== "string" || url.length === 0) {
      return res.status(400).json({
        error: "invalid_url",
        message: "url query parameter is required",
      });
    }

    const preview = await playlistService.getPreview(url);
    res.json(preview);
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
  asyncHandler(async (req, res) => {
    const { spotifyUrl, name, type, subscribed } = req.body ?? {};

    if (typeof spotifyUrl !== "string" || spotifyUrl.length === 0) {
      return res.status(400).json({
        error: "invalid_playlist_payload",
        message: "spotifyUrl is required and must be a non-empty string",
      });
    }

    if (name !== undefined && typeof name !== "string") {
      return res.status(400).json({
        error: "invalid_playlist_payload",
        message: "name must be a string when provided",
      });
    }

    if (type !== undefined && typeof type !== "string") {
      return res.status(400).json({
        error: "invalid_playlist_payload",
        message: "type must be a string when provided",
      });
    }

    if (subscribed !== undefined && typeof subscribed !== "boolean") {
      return res.status(400).json({
        error: "invalid_playlist_payload",
        message: "subscribed must be a boolean when provided",
      });
    }

    const playlist = await playlistService.create(req.body);
    res.status(201).json(playlist);
  }),
);

// PUT /api/playlist/:id - Update playlist
router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const { name, type, spotifyUrl, subscribed } = req.body ?? {};

    if (name !== undefined && typeof name !== "string") {
      return res.status(400).json({
        error: "invalid_playlist_payload",
        message: "name must be a string when provided",
      });
    }

    if (type !== undefined && typeof type !== "string") {
      return res.status(400).json({
        error: "invalid_playlist_payload",
        message: "type must be a string when provided",
      });
    }

    if (spotifyUrl !== undefined && typeof spotifyUrl !== "string") {
      return res.status(400).json({
        error: "invalid_playlist_payload",
        message: "spotifyUrl must be a string when provided",
      });
    }

    if (subscribed !== undefined && typeof subscribed !== "boolean") {
      return res.status(400).json({
        error: "invalid_playlist_payload",
        message: "subscribed must be a boolean when provided",
      });
    }

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
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await playlistService.remove(id);
    res.status(204).send();
  }),
);

// GET /api/playlist/retry/:id - Retry failed tracks
router.get(
  "/retry/:id",
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    await playlistService.retryFailedOfPlaylist(id);
    res.status(204).send();
  }),
);

export default router;
