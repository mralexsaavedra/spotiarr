import type { Router as ExpressRouter } from "express";
import { Router } from "express";
import type { Container } from "@/container";

export function createEventsRoutes(container: Container): ExpressRouter {
  const router: ExpressRouter = Router();

  // Delegate SSE client registration to the initialized EventsController instance.
  router.get("/", container.eventsController.connect);

  return router;
}
