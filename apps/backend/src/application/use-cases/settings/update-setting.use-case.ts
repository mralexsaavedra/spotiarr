import type { SpotifyUserLibraryPort } from "@/application/ports/spotify-user-library.port";
import type { EventBus } from "@/domain/events/event-bus";
import type { SettingsRepository } from "@/domain/repositories/settings.repository";
import { logger } from "@/infrastructure/logging/logger";
import { MASKED_SENTINEL } from "./get-settings.use-case";

const log = logger.child({ component: "update-setting" });

export class UpdateSettingUseCase {
  constructor(
    private readonly repository: SettingsRepository,
    private readonly spotifyUserLibraryService: SpotifyUserLibraryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(key: string, value: string): Promise<void> {
    if (value === MASKED_SENTINEL) {
      return;
    }

    let finalValue = value;

    if (key === "YT_COOKIES") {
      const isContent = value.includes("\n") || value.trim().startsWith("#");

      if (isContent) {
        const fs = await import("fs");
        const path = await import("path");
        const configDir = path.join(process.cwd(), "config");
        const cookiePath = path.join(configDir, "cookies.txt");

        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(cookiePath, value, "utf-8");
        finalValue = cookiePath;
        log.info({ cookiePath }, "Saved YouTube cookies");
      }
    }

    await this.repository.set(key, finalValue);
    this.spotifyUserLibraryService.clearCache();
    this.eventBus.emit("settings:updated", { key, value: finalValue });
  }
}
