import type { SettingItem } from "@spotiarr/shared";
import { SETTINGS_METADATA } from "@/constants/settings-metadata";
import type { SettingsRepository } from "@/domain/repositories/settings.repository";

export const MASKED_SENTINEL = "••••••••";

export class GetSettingsUseCase {
  constructor(private readonly repository: SettingsRepository) {}

  async execute(): Promise<SettingItem[]> {
    const items = await this.repository.findAll();
    return items.map((item) => {
      const meta = SETTINGS_METADATA[item.key];
      if (meta?.secret && item.value !== "") {
        return { ...item, value: MASKED_SENTINEL };
      }
      return item;
    });
  }
}
