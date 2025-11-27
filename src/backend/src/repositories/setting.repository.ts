import { Repository } from "typeorm";
import type { SettingsRepository } from "../domain/settings/settings.repository";
import { SettingEntity } from "../entities/setting.entity";
import { getDataSource } from "../setup/database";

export class SettingRepository implements SettingsRepository {
  private get repository(): Repository<SettingEntity> {
    return getDataSource().getRepository(SettingEntity);
  }

  findAll(): Promise<SettingEntity[]> {
    return this.repository.find();
  }

  async get(key: string): Promise<string | undefined> {
    const setting = await this.repository.findOne({ where: { key } });
    return setting?.value;
  }

  async set(key: string, value: string): Promise<void> {
    const existing = await this.repository.findOne({ where: { key } });
    const entity: SettingEntity = existing
      ? { ...existing, value, updatedAt: Date.now() }
      : ({ key, value, updatedAt: Date.now() } as SettingEntity);

    await this.repository.save(entity);
  }
}
