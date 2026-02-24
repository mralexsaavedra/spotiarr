import { TrackStatusEnum, type LibraryScanResult } from "@spotiarr/shared";
import { TrackRepository } from "@/domain/repositories/track.repository";
import { FileSystemScannerService } from "@/infrastructure/services/file-system-scanner.service";
import { FileSystemTrackPathService } from "@/infrastructure/services/file-system-track-path.service";

export class ScanLibraryUseCase {
  constructor(
    private readonly scannerService: FileSystemScannerService,
    private readonly pathService: FileSystemTrackPathService,
    private readonly trackRepository?: TrackRepository,
  ) {}

  async execute(): Promise<LibraryScanResult> {
    const startTime = Date.now();
    const libraryPath = this.pathService.getMusicLibraryPath();

    console.log(`🔍 Scanning music library at: ${libraryPath}`);

    const artists = await this.scannerService.scanMusicLibrary(libraryPath);

    // Try to attach duration from DB if available
    if (this.trackRepository) {
      try {
        const completedTracks = await this.trackRepository.findAllByStatuses([
          TrackStatusEnum.Completed,
        ]);

        // Build map for quick lookup. A precise match requires matching title and artist.
        const dbTrackMap = new Map<string, number>();
        for (const t of completedTracks) {
          const trackData = t.toPrimitive();
          if (trackData.durationMs) {
            // Simplified key: lowercase artist + name to maximize matches
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
                // frontend expects duration in seconds (based on frontend's * 1000)
                track.duration = Math.round(durationMs / 1000);
              }
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
