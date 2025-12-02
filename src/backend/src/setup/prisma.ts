import { PrismaClient } from "@prisma/client";
import { getEnv } from "./environment";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// We need to be careful here because getEnv() might not be ready if this is imported too early
// However, NODE_ENV is usually available on process.env directly
const isDev = process.env.NODE_ENV === "development";

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: isDev ? ["query", "error", "warn"] : ["error"],
  });

if (isDev) {
  globalForPrisma.prisma = prisma;
}
