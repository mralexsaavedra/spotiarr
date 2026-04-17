import type { Router as ExpressRouter } from "express";
import { Router } from "express";
import { container } from "@/container";

const router: ExpressRouter = Router();

// Delegate SSE client registration to the container's EventsController,
// which is the single source of truth for all server-sent events.
// Previously this file maintained its own client list, disconnected from
// the EventsController that all backend services emit to — meaning no
// events ever reached the frontend.
router.get("/", container.eventsController.connect);

export default router;
