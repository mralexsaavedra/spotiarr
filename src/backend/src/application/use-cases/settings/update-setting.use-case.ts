import type { SettingsRepository } from "../../../domain/repositories/settings.repository";
import type { SpotifyUserLibraryService } from "../../../infrastructure/external/spotify-user-library.service";

export class UpdateSettingUseCase {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly spotifyUserLibraryService: SpotifyUserLibraryService,
  ) {}

  async execute(key: string, value: string): Promise<void> {
    await this.repository.set(key, value);
    this.spotifyUserLibraryService.clearCache();
  }
}
