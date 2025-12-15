import type { EventBus } from "@/domain/events/event-bus";
import type { SettingsRepository } from "@/domain/repositories/settings.repository";
import type { SpotifyUserLibraryService } from "@/infrastructure/external/spotify-user-library.service";

export class UpdateSettingUseCase {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly spotifyUserLibraryService: SpotifyUserLibraryService,
    private readonly eventBus: EventBus,
  ) {}

  async execute(key: string, value: string): Promise<void> {
    await this.repository.set(key, value);
    this.spotifyUserLibraryService.clearCache();
    this.eventBus.emit("settings:updated", { key, value });
  }
}
