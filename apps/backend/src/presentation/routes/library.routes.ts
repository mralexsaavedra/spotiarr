import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { libraryAudioRequestSchema } from "./schemas/library.schema";

export function createLibraryRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { libraryController, artworkBackfillController } = container;

  // GET /api/library/stats - Get library statistics
  router.get("/stats", asyncHandler(libraryController.getStats));

  // GET /api/library/artists - Get all artists (summary)
  router.get("/artists", asyncHandler(libraryController.getArtists));

  // GET /api/library/artists/:name - Get specific artist with albums and tracks
  router.get("/artists/:name", asyncHandler(libraryController.getArtist));

  // GET /api/library/image?path=...
  router.get("/image", asyncHandler(libraryController.getImage));
  router.get(
    "/audio",
    validate(libraryAudioRequestSchema),
    asyncHandler(libraryController.streamAudio),
  );

  // POST /api/library/scan - Trigger a manual library scan
  router.post("/scan", asyncHandler(libraryController.scan));

  router.post("/artwork-backfill/start", asyncHandler(artworkBackfillController.start));
  router.post("/artwork-backfill/pause", asyncHandler(artworkBackfillController.pause));
  router.post("/artwork-backfill/resume", asyncHandler(artworkBackfillController.resume));
  router.get("/artwork-backfill/status", asyncHandler(artworkBackfillController.status));

  return router;
}
