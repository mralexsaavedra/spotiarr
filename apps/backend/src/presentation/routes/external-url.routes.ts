import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

export function createExternalUrlRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { externalUrlController } = container;

  router.get("/", asyncHandler(externalUrlController.resolve));

  return router;
}
