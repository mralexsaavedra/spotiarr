import type { ConnectivityPort } from "@/application/ports/connectivity.port";

export type HealthStatus = "ok" | "degraded";

export interface HealthReport {
  status: HealthStatus;
  checks: {
    database: "ok" | "error";
  };
}

export class HealthService {
  constructor(private readonly connectivity: ConnectivityPort) {}

  async check(): Promise<HealthReport> {
    try {
      await this.connectivity.pingDatabase();
      return { status: "ok", checks: { database: "ok" } };
    } catch {
      return { status: "degraded", checks: { database: "error" } };
    }
  }
}
