import { TrackStatusEnum, type LibraryScanResult } from "@spotiarr/shared";
import type {
  FileSystemScannerPort,
  FileSystemTrackPathPort,
} from "@/application/ports/file-system.port";
import type { SettingsPort } from "@/application/ports/settings.port";
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
  ) {}

  async execute(): Promise<LibraryScanResult> {
    const startTime = Date.now();
    const libraryPath = this.pathService.getMusicLibraryPath();

    console.log(`🔍 Scanning music library at: ${libraryPath}`);

    const artists = await this.scannerService.scanMusicLibrary(libraryPath);

    if (this.trackRepository) {
      // Build the set of scanned file paths once for O(1) membership checks
      const scannedPaths = new Set<string>();
      for (const artist of artists) {
        for (const album of artist.albums) {
          for (const track of album.tracks) {
            scannedPaths.add(track.filePath);
          }
        }
      }

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

          for (const track of completedTracks) {
            if (!track.id) continue;

            // Skip permanently-unfindable tracks — re-driving them would loop forever
            if (track.isTerminalError() || track.searchAttempts >= safeMaxAttempts) {
              continue;
            }

            try {
              // Resolve the expected on-disk path using the SAME derivation as
              // DownloadTrackUseCase: getFolderName(track, playlistName).
              // The scan use-case does not have playlist names in scope, so it
              // passes undefined. This is correct for Album/Artist tracks; for
              // Playlist/AI tracks the path will differ from what the download
              // wrote (which included the playlist name). This is a documented
              // minor divergence — a false-negative (missing detection skipped)
              // for Playlist/AI tracks rather than a false-positive (spurious re-download).
              const expectedPath = await this.pathService.getFolderName(
                track.toPrimitive(),
                undefined,
              );

              if (!scannedPaths.has(expectedPath)) {
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
