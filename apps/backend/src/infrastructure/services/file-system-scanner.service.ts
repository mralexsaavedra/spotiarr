import type { LibraryAlbum, LibraryArtist, LibraryTrack } from "@spotiarr/shared";
import { SUPPORTED_AUDIO_FORMATS } from "@spotiarr/shared";
import fs from "fs/promises";
import path from "path";

export class FileSystemScannerService {
  private readonly audioExtensions = SUPPORTED_AUDIO_FORMATS.map((ext) => `.${ext}`);
  private readonly imageExtensions = [".jpg", ".jpeg", ".png", ".webp"];

  /**
   * Scan a directory and return all artists with their albums and tracks
   */
  async scanMusicLibrary(libraryPath: string): Promise<LibraryArtist[]> {
    const artists: LibraryArtist[] = [];

    try {
      const entries = await fs.readdir(libraryPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        // Skip special folders
        if (entry.name === "Playlists" || entry.name.startsWith(".")) continue;

        const artistPath = path.join(libraryPath, entry.name);
        const artist = await this.scanArtist(entry.name, artistPath);

        if (artist && artist.albumCount > 0) {
          artists.push(artist);
        }
      }

      // Sort artists alphabetically
      artists.sort((a, b) => a.name.localeCompare(b.name));

      return artists;
    } catch (error) {
      console.error(`Error scanning music library at ${libraryPath}:`, error);
      return [];
    }
  }

  /**
   * Scan an artist folder and return all albums
   */
  private async scanArtist(artistName: string, artistPath: string): Promise<LibraryArtist | null> {
    try {
      const entries = await fs.readdir(artistPath, { withFileTypes: true });
      const albums: LibraryAlbum[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name.startsWith(".")) continue;

        const albumPath = path.join(artistPath, entry.name);
        const album = await this.scanAlbum(artistName, entry.name, albumPath);

        if (album && album.trackCount > 0) {
          albums.push(album);
        }
      }

      if (albums.length === 0) return null;

      // Sort albums by name
      albums.sort((a, b) => a.name.localeCompare(b.name));

      const totalTracks = albums.reduce((sum, album) => sum + album.trackCount, 0);
      const totalSize = albums.reduce((sum, album) => sum + album.totalSize, 0);

      // Look for artist image
      const artistImage = await this.findImage(artistPath);

      return {
        name: artistName,
        path: artistPath,
        albumCount: albums.length,
        trackCount: totalTracks,
        totalSize,
        image: artistImage,
        albums,
      };
    } catch (error) {
      console.error(`Error scanning artist ${artistName}:`, error);
      return null;
    }
  }

  /**
   * Scan an album folder and return all tracks
   */
  private async scanAlbum(
    artistName: string,
    albumName: string,
    albumPath: string,
  ): Promise<LibraryAlbum | null> {
    try {
      const entries = await fs.readdir(albumPath, { withFileTypes: true });
      const tracks: LibraryTrack[] = [];

      for (const entry of entries) {
        if (!entry.isFile()) continue;

        const ext = path.extname(entry.name).toLowerCase();
        if (!this.audioExtensions.includes(ext)) continue;

        const trackPath = path.join(albumPath, entry.name);
        const track = await this.scanTrack(artistName, albumName, entry.name, trackPath);

        if (track) {
          tracks.push(track);
        }
      }

      if (tracks.length === 0) return null;

      // Sort tracks by track number, then by filename
      tracks.sort((a, b) => {
        if (a.trackNumber && b.trackNumber) {
          if (a.discNumber !== b.discNumber) {
            return (a.discNumber || 0) - (b.discNumber || 0);
          }
          return a.trackNumber - b.trackNumber;
        }
        return a.fileName.localeCompare(b.fileName);
      });

      const totalSize = tracks.reduce((sum, track) => sum + track.size, 0);

      // Try to extract year from album name or first track
      const year = this.extractYear(albumName);

      // Look for album cover
      const albumImage = await this.findImage(albumPath);

      return {
        name: albumName,
        path: albumPath,
        artist: artistName,
        trackCount: tracks.length,
        totalSize,
        year,
        image: albumImage,
        tracks,
      };
    } catch (error) {
      console.error(`Error scanning album ${albumName}:`, error);
      return null;
    }
  }

  /**
   * Scan a single track file and extract basic info
   */
  private async scanTrack(
    artistName: string,
    albumName: string,
    fileName: string,
    filePath: string,
  ): Promise<LibraryTrack | null> {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(fileName).toLowerCase().slice(1);

      // Parse track info from filename
      const { trackNumber, discNumber, name } = this.parseFileName(fileName);

      let duration: number | undefined = undefined;
      try {
        const mm = await import("music-metadata");
        const metadata = await mm.parseFile(filePath, { duration: true, skipCovers: true });
        if (metadata.format?.duration) {
          duration = Math.round(metadata.format.duration);
        }
      } catch (err) {
        console.warn(`Failed to read metadata for ${fileName}:`, err);
      }

      return {
        fileName,
        filePath,
        trackNumber,
        discNumber,
        name: name || fileName,
        artist: artistName,
        album: albumName,
        format: ext,
        size: stats.size,
        duration,
        modifiedAt: stats.mtimeMs,
      };
    } catch (error) {
      console.error(`Error scanning track ${fileName}:`, error);
      return null;
    }
  }

  /**
   * Parse filename to extract track number, disc number, and name
   * Supports formats like:
   * - "01 - Track Name.mp3"
   * - "1-01 - Track Name.mp3" (disc-track)
   * - "01 - Artist - Track Name.mp3"
   */
  private parseFileName(fileName: string): {
    trackNumber?: number;
    discNumber?: number;
    name: string;
  } {
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");

    // Try to match disc-track format: "1-01 - Track Name"
    const discTrackMatch = nameWithoutExt.match(/^(\d+)-(\d+)\s*-\s*(.+)$/);
    if (discTrackMatch) {
      return {
        discNumber: parseInt(discTrackMatch[1], 10),
        trackNumber: parseInt(discTrackMatch[2], 10),
        name: discTrackMatch[3].trim(),
      };
    }

    // Try to match track format: "01 - Track Name" or "01 - Artist - Track Name"
    const trackMatch = nameWithoutExt.match(/^(\d+)\s*-\s*(.+)$/);
    if (trackMatch) {
      const trackNumber = parseInt(trackMatch[1], 10);
      let name = trackMatch[2].trim();

      // If there's another " - ", it might be "Artist - Track Name"
      const artistTrackMatch = name.match(/^.+?\s*-\s*(.+)$/);
      if (artistTrackMatch) {
        name = artistTrackMatch[1].trim();
      }

      return {
        trackNumber,
        name,
      };
    }

    // No pattern matched, return the full name
    return {
      name: nameWithoutExt,
    };
  }

  /**
   * Extract year from album name
   * Looks for patterns like "(2023)" or "[2023]"
   */
  private extractYear(albumName: string): number | undefined {
    const yearMatch = albumName.match(/[([](\d{4})[)\]]/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 1900 && year <= new Date().getFullYear() + 1) {
        return year;
      }
    }
    return undefined;
  }

  /**
   * Check if a file exists
   */
  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Find an image file in a directory
   * Prioritizes common names like folder.jpg, cover.jpg, artist.jpg
   */
  private async findImage(dirPath: string): Promise<string | undefined> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const files = entries.filter((e) => e.isFile());

      // Priority list
      const priorities = ["folder", "cover", "artist", "album", "front"];

      // Check for exact matches with any extension
      for (const priority of priorities) {
        for (const ext of this.imageExtensions) {
          const match = files.find((f) => f.name.toLowerCase() === `${priority}${ext}`);
          if (match) {
            // Return relative path from the library, but since we don't have library root here easily,
            // we'll return the absolute path and handle it later or ensuring we standardise.
            // Actually, for now let's just return the absolute path and have the API serve it.
            // But wait, the API needs to serve it securely.
            // If we assume the frontend will ask for /api/library/image?path=..., we can return the absolute path.
            return path.join(dirPath, match.name);
          }
        }
      }

      // If no priority match, find any image
      const anyImage = files.find((f) =>
        this.imageExtensions.includes(path.extname(f.name).toLowerCase()),
      );

      if (anyImage) {
        return path.join(dirPath, anyImage.name);
      }

      return undefined;
    } catch {
      return undefined;
    }
  }
}
