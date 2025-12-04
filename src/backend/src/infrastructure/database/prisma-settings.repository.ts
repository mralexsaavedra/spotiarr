import type { SettingItem } from "@spotiarr/shared";
import type { SettingsRepository } from "../../domain/interfaces/settings-repository.interface";
import { prisma } from "../setup/prisma";

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
    await prisma.setting
      .delete({
        where: { key },
      })
      .catch(() => {
        // Ignore if key doesn't exist
      });
  }
}
