import { Router, type Router as ExpressRouter } from "express";
import type { Container } from "../../container";

export function createHealthRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();
  const { healthController } = container;

  // GET /api/health - Health check endpoint
  router.get("/", healthController.check);

  return router;
}
