import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

export function createTrackRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { trackController } = container;

  router.get("/playlist/:id", asyncHandler(trackController.getAllByPlaylist));

  router.delete("/:id", asyncHandler(trackController.remove));

  router.post("/:id/retry", asyncHandler(trackController.retry));

  return router;
}
