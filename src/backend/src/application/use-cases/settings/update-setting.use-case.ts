import type { SettingsRepository } from "../../../domain/repositories/settings.repository";
import type { SpotifyApiService } from "../../../infrastructure/external/spotify-api.service";

export class UpdateSettingUseCase {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly spotifyApiService: SpotifyApiService,
  ) {}

  async execute(key: string, value: string): Promise<void> {
    await this.repository.set(key, value);
    this.spotifyApiService.clearCache();
  }
}
