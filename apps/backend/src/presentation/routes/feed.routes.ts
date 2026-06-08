import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

export function createFeedRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { feedController } = container;

  router.get("/releases", asyncHandler(feedController.getRecentReleases));

  router.get("/artists", asyncHandler(feedController.getArtists));

  return router;
}
