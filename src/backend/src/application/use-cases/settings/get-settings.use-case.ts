import type { SettingItem } from "@spotiarr/shared";
import type { SettingsRepository } from "@/domain/repositories/settings.repository";

export class GetSettingsUseCase {
  constructor(private readonly repository: SettingsRepository) {}

  async execute(): Promise<SettingItem[]> {
    return this.repository.findAll();
  }
}
