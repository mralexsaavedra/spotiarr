import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

export function createHistoryRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { historyController } = container;

  // GET /api/history/downloads - Get recent completed downloads
  router.get("/downloads", asyncHandler(historyController.getRecentDownloads));

  // GET /api/history/tracks - Get recent completed download tracks
  router.get("/tracks", asyncHandler(historyController.getRecentTracks));

  return router;
}
