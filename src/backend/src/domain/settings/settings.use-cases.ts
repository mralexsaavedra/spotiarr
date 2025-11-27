import type { SettingEntity } from "../../entities/setting.entity";
import type { SettingsRepository } from "./settings.repository";

export interface SettingsUseCaseDependencies {
  repository: SettingsRepository;
}

export class SettingsUseCases {
  constructor(private readonly deps: SettingsUseCaseDependencies) {}

  getAll(): Promise<SettingEntity[]> {
    return this.deps.repository.findAll();
  }

  async update(key: string, value: string): Promise<void> {
    await this.deps.repository.set(key, value);
  }
}
