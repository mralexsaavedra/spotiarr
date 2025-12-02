import { PrismaClient } from "@prisma/client";

// Simple Prisma Client instance
// In production, this is all we need.
// In development, if you see "Too many connections" errors, just restart the server.
export const prisma = new PrismaClient();
