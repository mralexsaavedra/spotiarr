import type { ConnectivityPort } from "@/application/ports/connectivity.port";

export type HealthStatus = "ok" | "degraded";

export interface HealthReport {
  status: HealthStatus;
  components: {
    db: "ok" | "down";
  };
}

export class HealthService {
  constructor(private readonly connectivity: ConnectivityPort) {}

  async check(): Promise<HealthReport> {
    try {
      await this.connectivity.pingDatabase();
      return { status: "ok", components: { db: "ok" } };
    } catch {
      return { status: "degraded", components: { db: "down" } };
    }
  }
}
