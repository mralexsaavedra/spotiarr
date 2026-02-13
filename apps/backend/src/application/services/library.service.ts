import type { LibraryArtist, LibraryScanResult, LibraryStats } from "@spotiarr/shared";
import { ScanLibraryUseCase } from "../use-cases/library/scan-library.use-case";

export class LibraryService {
  private scanPromise: Promise<LibraryScanResult> | null = null;
  private cachedScanResult: LibraryScanResult | null = null;

  constructor(private readonly scanLibraryUseCase: ScanLibraryUseCase) {}

  /**
   * Get the full library scan result (with caching)
   */
  async getLibrary(forceRefresh = false): Promise<LibraryScanResult> {
    if (this.scanPromise) {
      return this.scanPromise;
    }

    if (!forceRefresh && this.cachedScanResult) {
      return this.cachedScanResult;
    }

    this.scanPromise = (async () => {
      try {
        const result = await this.scanLibraryUseCase.execute();
        this.cachedScanResult = result;
        return result;
      } finally {
        this.scanPromise = null;
      }
    })();

    return this.scanPromise;
  }

  /**
   * Get library statistics only
   */
  async getStats(): Promise<LibraryStats> {
    const library = await this.getLibrary();

    return {
      totalArtists: library.totalArtists,
      totalAlbums: library.totalAlbums,
      totalTracks: library.totalTracks,
      totalSize: library.totalSize,
      lastScannedAt: library.lastScannedAt,
    };
  }

  /**
   * Get all artists (without full album/track details)
   */
  async getArtists(): Promise<
    Array<{
      name: string;
      path: string;
      albumCount: number;
      trackCount: number;
      totalSize: number;
      image?: string;
    }>
  > {
    const library = await this.getLibrary();

    return library.artists.map((artist) => ({
      name: artist.name,
      path: artist.path,
      albumCount: artist.albumCount,
      trackCount: artist.trackCount,
      totalSize: artist.totalSize,
      image: artist.image,
    }));
  }

  /**
   * Get a specific artist with all albums and tracks
   */
  async getArtist(artistName: string): Promise<LibraryArtist | null> {
    const library = await this.getLibrary();

    return library.artists.find((artist) => artist.name === artistName) || null;
  }

  /**
   * Trigger a manual scan
   */
  async scan(): Promise<LibraryScanResult> {
    return this.getLibrary(true);
  }

  /**
   * Clear the cache (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cachedScanResult = null;
  }
}
