import type { SettingItem } from "@spotiarr/shared";
import { SpotifyApiService } from "../../infrastructure/external/spotify-api.service";
import type { SettingsRepository } from "../interfaces/settings.repository";

export interface SettingsUseCaseDependencies {
  repository: SettingsRepository;
}

export class SettingsUseCases {
  constructor(private readonly deps: SettingsUseCaseDependencies) {}

  getAll(): Promise<SettingItem[]> {
    return this.deps.repository.findAll();
  }

  async update(key: string, value: string): Promise<void> {
    await this.deps.repository.set(key, value);

    const spotifyService = SpotifyApiService.getInstance();
    spotifyService.clearCache();
  }
}
