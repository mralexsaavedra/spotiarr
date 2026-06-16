import { PlaylistTypeEnum, TrackStatusEnum, type LibraryScanResult } from "@spotiarr/shared";
import type {
  FileSystemScannerPort,
  FileSystemTrackPathPort,
} from "@/application/ports/file-system.port";
import type { SettingsPort } from "@/application/ports/settings.port";
import type { PlaylistRepository } from "@/domain/repositories/playlist.repository";
import type { TrackRepository } from "@/domain/repositories/track.repository";
import type { RetryTrackDownloadUseCase } from "../tracks/retry-track-download.use-case";

const DEFAULT_SEARCH_MAX_ATTEMPTS = 5;

export class ScanLibraryUseCase {
  constructor(
    private readonly scannerService: FileSystemScannerPort,
    private readonly pathService: FileSystemTrackPathPort,
    private readonly trackRepository?: TrackRepository,
    private readonly retryTrackDownloadUseCase?: RetryTrackDownloadUseCase,
    private readonly settingsService?: SettingsPort,
    private readonly playlistRepository?: PlaylistRepository,
  ) {}

  async execute(): Promise<LibraryScanResult> {
    const startTime = Date.now();
    const libraryPath = this.pathService.getMusicLibraryPath();

    console.log(`🔍 Scanning music library at: ${libraryPath}`);

    const artists = await this.scannerService.scanMusicLibrary(libraryPath);

    if (this.trackRepository) {
      try {
        const completedTracks = await this.trackRepository.findAllByStatuses([
          TrackStatusEnum.Completed,
        ]);

        // Attach durations from DB
        const dbTrackMap = new Map<string, number>();
        for (const t of completedTracks) {
          const trackData = t.toPrimitive();
          if (trackData.durationMs) {
            const key = `${trackData.artist.toLowerCase()} - ${trackData.name.toLowerCase()}`;
            dbTrackMap.set(key, trackData.durationMs);
          }
        }

        for (const artist of artists) {
          for (const album of artist.albums) {
            for (const track of album.tracks) {
              const key = `${artist.name.toLowerCase()} - ${track.name.toLowerCase()}`;
              const durationMs = dbTrackMap.get(key);
              if (!track.duration && durationMs) {
                track.duration = Math.round(durationMs / 1000);
              }
            }
          }
        }

        // Completed-file reconciliation pass
        if (this.retryTrackDownloadUseCase) {
          const maxAttempts = this.settingsService
            ? await this.settingsService.getNumber("SEARCH_MAX_ATTEMPTS")
            : DEFAULT_SEARCH_MAX_ATTEMPTS;
          const safeMaxAttempts = maxAttempts >= 1 ? maxAttempts : DEFAULT_SEARCH_MAX_ATTEMPTS;

          // Resolve playlist names the SAME way DownloadTrackUseCase does, so
          // the reconciliation path matches what the download actually wrote.
          // Only Playlist/AI tracks live under the playlist folder; album and
          // artist downloads do not. Cache per playlistId to avoid N queries.
          const playlistNameCache = new Map<string, string | undefined>();
          const resolvePlaylistName = async (playlistId?: string): Promise<string | undefined> => {
            if (!playlistId || !this.playlistRepository) return undefined;
            if (playlistNameCache.has(playlistId)) return playlistNameCache.get(playlistId);
            const playlist = await this.playlistRepository.findOne(playlistId);
            const name =
              playlist &&
              (playlist.type === PlaylistTypeEnum.Playlist || playlist.type === PlaylistTypeEnum.Ai)
                ? playlist.name
                : undefined;
            playlistNameCache.set(playlistId, name);
            return name;
          };

          for (const track of completedTracks) {
            if (!track.id) continue;

            // Skip permanently-unfindable tracks — re-driving them would loop forever
            if (track.isTerminalError() || track.searchAttempts >= safeMaxAttempts) {
              continue;
            }

            try {
              const trackData = track.toPrimitive();
              const playlistName = await resolvePlaylistName(trackData.playlistId);
              // Check the file directly at the path the download wrote (same
              // getFolderName derivation), so parity is guaranteed and the
              // check also covers the Playlists/ zone that the library scan
              // intentionally skips.
              const expectedPath = await this.pathService.getFolderName(trackData, playlistName);

              if (!(await this.scannerService.fileExists(expectedPath))) {
                await this.retryTrackDownloadUseCase.execute(track.id);
              }
            } catch (err) {
              console.warn(`[ScanLibrary] Reconciliation failed for track ${track.id}:`, err);
            }
          }
        }
      } catch (err) {
        console.warn("Failed to attach track durations from database:", err);
      }
    }

    const totalArtists = artists.length;
    const totalAlbums = artists.reduce((sum, artist) => sum + artist.albumCount, 0);
    const totalTracks = artists.reduce((sum, artist) => sum + artist.trackCount, 0);
    const totalSize = artists.reduce((sum, artist) => sum + artist.totalSize, 0);

    const scanDuration = Date.now() - startTime;

    console.log(`✅ Library scan completed in ${scanDuration}ms`);
    console.log(`   Found: ${totalArtists} artists, ${totalAlbums} albums, ${totalTracks} tracks`);
    console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

    return {
      artists,
      totalArtists,
      totalAlbums,
      totalTracks,
      totalSize,
      lastScannedAt: Date.now(),
      scanDuration,
    };
  }
}
