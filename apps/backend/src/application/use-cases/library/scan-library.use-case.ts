import type { LibraryScanResult } from "@spotiarr/shared";
import { FileSystemScannerService } from "@/infrastructure/services/file-system-scanner.service";
import { FileSystemTrackPathService } from "@/infrastructure/services/file-system-track-path.service";

export class ScanLibraryUseCase {
  constructor(
    private readonly scannerService: FileSystemScannerService,
    private readonly pathService: FileSystemTrackPathService,
  ) {}

  async execute(): Promise<LibraryScanResult> {
    const startTime = Date.now();
    const libraryPath = this.pathService.getMusicLibraryPath();

    console.log(`🔍 Scanning music library at: ${libraryPath}`);

    const artists = await this.scannerService.scanMusicLibrary(libraryPath);

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
