import { Request, Response } from "express";
import type { HealthService } from "@/application/services/health.service";

export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  check = async (_req: Request, res: Response) => {
    const report = await this.healthService.check();
    if (report.status === "ok") {
      return res.status(200).json({ status: "ok" });
    }

    return res.status(503).json({
      status: "degraded",
      components: report.components,
    });
  };
}
