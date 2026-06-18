import type { ConnectivityPort } from "@/application/ports/connectivity.port";

type HealthStatus = "ok" | "degraded";

type ComponentStatus = "ok" | "down";

export interface HealthReport {
  status: HealthStatus;
  components: {
    db: ComponentStatus;
    redis: ComponentStatus;
  };
}

export class HealthService {
  constructor(private readonly connectivity: ConnectivityPort) {}

  async check(): Promise<HealthReport> {
    const [db, redis] = await Promise.all([
      this.probe(() => this.connectivity.pingDatabase()),
      this.probe(() => this.connectivity.pingRedis()),
    ]);

    const status: HealthStatus = db === "ok" && redis === "ok" ? "ok" : "degraded";
    return { status, components: { db, redis } };
  }

  private async probe(ping: () => Promise<void>): Promise<ComponentStatus> {
    try {
      await ping();
      return "ok";
    } catch {
      return "down";
    }
  }
}
