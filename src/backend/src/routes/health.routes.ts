import { PrismaClient } from "@prisma/client";
import { Router, type Router as ExpressRouter } from "express";

const router: ExpressRouter = Router();
const prisma = new PrismaClient();

// GET /api/health - Health check endpoint
router.get("/", async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: "ok",
    checks: {
      database: "unknown" as "ok" | "error" | "unknown",
    },
  };

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database = "ok";
  } catch {
    health.checks.database = "error";
    health.status = "degraded";
  }

  const statusCode = health.status === "ok" ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;
