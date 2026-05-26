import type { ConnectivityPort } from "@/application/ports/connectivity.port";
import { prisma } from "@/infrastructure/setup/prisma";

export class PrismaConnectivityAdapter implements ConnectivityPort {
  async pingDatabase(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  }
}
