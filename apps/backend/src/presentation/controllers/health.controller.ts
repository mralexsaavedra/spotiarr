import { Request, Response } from "express";
import type { HealthService } from "@/application/services/health.service";

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  check = async (_req: Request, res: Response) => {
    const report = await this.healthService.check();
    const health = {
      uptime: process.uptime(),
      timestamp: Date.now(),
      status: report.status,
      checks: report.checks,
    };

    const statusCode = health.status === "ok" ? 200 : 503;
    res.status(statusCode).json(health);
  };
}
