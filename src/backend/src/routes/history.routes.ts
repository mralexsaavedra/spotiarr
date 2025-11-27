import { Router, type Router as ExpressRouter } from "express";
import { HistoryUseCases } from "../domain/history/history.use-cases";
import { asyncHandler } from "../middleware/async-handler";
import { PrismaHistoryRepository } from "../repositories/prisma-history.repository";

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

export default router;
