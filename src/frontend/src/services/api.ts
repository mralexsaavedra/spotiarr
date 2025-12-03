import { artistService } from "./artist.service";
import { historyService } from "./history.service";
import { playlistService } from "./playlist.service";
import { settingsService } from "./settings.service";
import { trackService } from "./track.service";

// Re-export everything for backward compatibility
export const api = {
  ...playlistService,
  ...trackService,
  ...historyService,
  ...settingsService,
  ...artistService,
};
