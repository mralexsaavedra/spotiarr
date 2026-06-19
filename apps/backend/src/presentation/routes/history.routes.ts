import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";
import { validate } from "../middleware/validate";
import { historyLimitQuerySchema, recordPlaySchema } from "./schemas/history.schema";

export function createHistoryRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { historyController } = container;

  router.get("/downloads", asyncHandler(historyController.getRecentDownloads));

  router.get("/tracks", asyncHandler(historyController.getRecentTracks));

  router.post("/plays", validate(recordPlaySchema), asyncHandler(historyController.recordPlay));

  router.get(
    "/top-tracks",
    validate(historyLimitQuerySchema),
    asyncHandler(historyController.getTopTracks),
  );

  router.get(
    "/top-artists",
    validate(historyLimitQuerySchema),
    asyncHandler(historyController.getTopArtists),
  );

  router.get(
    "/recent-plays",
    validate(historyLimitQuerySchema),
    asyncHandler(historyController.getRecentPlays),
  );

  return router;
}
