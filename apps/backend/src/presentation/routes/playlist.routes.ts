import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import {
  createPlaylistSchema,
  playlistIdSchema,
  playlistPreviewSchema,
  playlistPreviewTracksSchema,
  updatePlaylistSchema,
} from "./schemas/playlist.schema";

export function createPlaylistRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { playlistController } = container;

  // GET /api/playlist/preview - Get playlist preview from Spotify URL
  router.get(
    "/preview",
    validate(playlistPreviewSchema),
    asyncHandler(playlistController.getPreview),
  );

  // GET /api/playlist/preview/tracks - Get paginated preview tracks from Spotify URL
  router.get(
    "/preview/tracks",
    validate(playlistPreviewTracksSchema),
    asyncHandler(playlistController.getPreviewTracks),
  );

  // GET /api/playlist/me - Get user's playlists from Spotify
  router.get("/me", asyncHandler(playlistController.getMyPlaylists));

  // GET /api/playlist/status - Get download status summary
  router.get("/status", asyncHandler(playlistController.getDownloadStatus));

  // GET /api/playlist - Get all playlists
  router.get("/", asyncHandler(playlistController.findAll));

  // POST /api/playlist - Create new playlist
  router.post("/", validate(createPlaylistSchema), asyncHandler(playlistController.create));

  // PUT /api/playlist/:id - Update playlist
  router.put("/:id", validate(updatePlaylistSchema), asyncHandler(playlistController.update));

  // DELETE /api/playlist/:id - Delete playlist
  router.delete("/:id", validate(playlistIdSchema), asyncHandler(playlistController.remove));

  // POST /api/playlist/:id/retry - Retry failed tracks
  router.post(
    "/:id/retry",
    validate(playlistIdSchema),
    asyncHandler(playlistController.retryFailedOfPlaylist),
  );

  return router;
}
