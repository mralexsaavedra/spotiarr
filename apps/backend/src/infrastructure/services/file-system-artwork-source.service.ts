import { access, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ArtworkAssetsPort } from "@/application/ports/artwork-assets.port";
import type { ArtworkBackfillFileSystemSourcePort } from "@/application/ports/artwork-backfill-sources.port";
import type { FileSystemTrackPathPort } from "@/application/ports/file-system.port";

export class FileSystemArtworkSourceService implements ArtworkBackfillFileSystemSourcePort {
  constructor(
    private readonly pathPort: FileSystemTrackPathPort,
    private readonly artworkAssets: ArtworkAssetsPort,
  ) {}

  async hasArtistArtwork(artistName: string): Promise<boolean> {
    return this.exists(join(this.pathPort.getArtistFolderPath(artistName), "folder.jpg"));
  }

  async hasAlbumArtwork(artistName: string, albumName: string): Promise<boolean> {
    return this.exists(join(this.pathPort.getAlbumFolderPath(artistName, albumName), "cover.jpg"));
  }

  async writeArtistArtworkIfMissing(artistName: string, imageUrl: string): Promise<boolean> {
    const targetPath = join(this.pathPort.getArtistFolderPath(artistName), "folder.jpg");
    return this.writeIfMissing(targetPath, imageUrl);
  }

  async writeAlbumArtworkIfMissing(
    artistName: string,
    albumName: string,
    imageUrl: string,
  ): Promise<boolean> {
    const targetPath = join(this.pathPort.getAlbumFolderPath(artistName, albumName), "cover.jpg");
    return this.writeIfMissing(targetPath, imageUrl);
  }

  async listAlbumTrackPaths(artistName: string, albumName: string): Promise<string[]> {
    const albumPath = this.pathPort.getAlbumFolderPath(artistName, albumName);
    const entries = await this.readDirectorySafe(albumPath);
    return entries
      .filter((entry) => entry.isFile())
      .map((entry) => join(albumPath, entry.name))
      .filter((filePath) => /\.(mp3|flac|m4a|wav|ogg|opus|aac)$/i.test(filePath));
  }

  private async readDirectorySafe(path: string) {
    try {
      return await readdir(path, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private async writeIfMissing(targetPath: string, imageUrl: string): Promise<boolean> {
    const content = await this.resolveContent(imageUrl);
    if (!content) {
      return false;
    }

    await this.artworkAssets.writeFileIfMissing(targetPath, content);
    return true;
  }

  private async resolveContent(imageUrl: string): Promise<Buffer | null> {
    if (imageUrl.startsWith("file://")) {
      return readFile(imageUrl.slice(7));
    }
    return this.artworkAssets.downloadImage(imageUrl);
  }

  private async exists(filePath: string): Promise<boolean> {
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
