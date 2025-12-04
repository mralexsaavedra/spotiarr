import type { SettingItem } from "@spotiarr/shared";

export interface SettingsRepository {
  findAll(): Promise<SettingItem[]>;

  get(key: string): Promise<string | undefined>;

  set(key: string, value: string): Promise<void>;

  delete(key: string): Promise<void>;
}
