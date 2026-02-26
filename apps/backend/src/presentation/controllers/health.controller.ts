import { Request, Response } from "express";
import { prisma } from "@/infrastructure/setup/prisma";

export class HealthController {
  check = async (_req: Request, res: Response) => {
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
  };
}
