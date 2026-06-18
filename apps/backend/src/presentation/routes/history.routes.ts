import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { historyLimitQuerySchema, recordPlaySchema } from "./schemas/history.schema";

export function createHistoryRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { historyController } = container;

  // GET /api/history/downloads - Get recent completed downloads
  router.get("/downloads", asyncHandler(historyController.getRecentDownloads));

  // GET /api/history/tracks - Get recent completed download tracks
  router.get("/tracks", asyncHandler(historyController.getRecentTracks));

  // POST /api/history/plays - Record a play event
  router.post("/plays", validate(recordPlaySchema), asyncHandler(historyController.recordPlay));

  // GET /api/history/top-tracks - Top tracks by play count
  router.get(
    "/top-tracks",
    validate(historyLimitQuerySchema),
    asyncHandler(historyController.getTopTracks),
  );

  // GET /api/history/top-artists - Top artists by play count
  router.get(
    "/top-artists",
    validate(historyLimitQuerySchema),
    asyncHandler(historyController.getTopArtists),
  );

  // GET /api/history/recent-plays - Most recent play events
  router.get(
    "/recent-plays",
    validate(historyLimitQuerySchema),
    asyncHandler(historyController.getRecentPlays),
  );

  return router;
}
