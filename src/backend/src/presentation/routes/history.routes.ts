import { Router, type Router as ExpressRouter } from "express";
import { HistoryUseCases } from "../../application/use-cases/history/history.use-cases";
import { PrismaHistoryRepository } from "../../infrastructure/database/prisma-history.repository";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const historyUseCases = new HistoryUseCases({ repository: new PrismaHistoryRepository() });

// GET /api/history/downloads - Get recent completed downloads
router.get(
  "/downloads",
  asyncHandler(async (_req, res) => {
    const items = await historyUseCases.getRecentDownloads();
    res.json({ data: items });
  }),
);

// GET /api/history/tracks - Get recent completed download tracks
router.get(
  "/tracks",
  asyncHandler(async (_req, res) => {
    const items = await historyUseCases.getRecentTracks();
    res.json({ data: items });
  }),
);

export default router;
