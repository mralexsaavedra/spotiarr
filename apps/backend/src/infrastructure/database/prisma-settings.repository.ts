import { Prisma } from "@prisma/client";
import type { SettingItem } from "@spotiarr/shared";
import { AppError } from "@/domain/errors/app-error";
import type { SettingsRepository } from "@/domain/repositories/settings.repository";
import { prisma } from "../setup/prisma";

const isPrismaNotFoundError = (error: unknown): error is { code: string } =>
  error instanceof Error && "code" in error && error.code === "P2025";

export class PrismaSettingsRepository implements SettingsRepository {
  async findAll(): Promise<SettingItem[]> {
    const settings = await prisma.setting.findMany();
    return settings.map((s) => ({
      key: s.key,
      value: s.value,
      updatedAt: s.updatedAt ? Number(s.updatedAt).toString() : undefined,
    }));
  }

  async get(key: string): Promise<string | undefined> {
    const setting = await prisma.setting.findUnique({ where: { key } });
    return setting?.value;
  }

  async set(key: string, value: string): Promise<void> {
    const now = Date.now();

    await prisma.setting.upsert({
      where: { key },
      update: { value, updatedAt: BigInt(now) },
      create: { key, value, updatedAt: BigInt(now) },
    });
  }

  async delete(key: string): Promise<void> {
    try {
      await prisma.setting.delete({ where: { key } });
    } catch (error) {
      if (isPrismaNotFoundError(error)) {
        // Record not found — idempotent, ignore
        return;
      }
      console.error("[PrismaSettingsRepository] delete failed", error);
      throw new AppError(500, "internal_server_error", "Failed to delete setting");
    }
  }
}
