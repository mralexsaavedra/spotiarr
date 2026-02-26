import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";

const router: ExpressRouter = Router();
const { healthController } = container;

// GET /api/health - Health check endpoint
router.get("/", healthController.check);

export default router;
