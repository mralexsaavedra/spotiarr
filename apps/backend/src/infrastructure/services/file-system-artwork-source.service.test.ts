import { describe, expect, it, vi } from "vitest";
import { FileSystemArtworkSourceService } from "./file-system-artwork-source.service";

describe("FileSystemArtworkSourceService", () => {
  it("returns empty track list when album directory does not exist", async () => {
    const pathPort = {
      getArtistFolderPath: vi.fn(),
      getAlbumFolderPath: vi.fn().mockReturnValue("/missing/album"),
    } as any;
    const artworkAssets = {
      writeFileIfMissing: vi.fn(),
      downloadImage: vi.fn(),
    } as any;

    const service = new FileSystemArtworkSourceService(pathPort, artworkAssets);

    await expect(service.listAlbumTrackPaths("Artist", "Album")).resolves.toEqual([]);
  });
});
