import type { SettingEntity } from "../../entities/setting.entity";

// Domain-level repository interface for settings. Infrastructure-agnostic.
export interface SettingsRepository {
  findAll(): Promise<SettingEntity[]>;

  get(key: string): Promise<string | undefined>;

  set(key: string, value: string): Promise<void>;
}
