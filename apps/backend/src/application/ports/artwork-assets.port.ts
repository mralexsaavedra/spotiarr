export interface ArtworkAssetsPort {
  downloadImage(url: string): Promise<Buffer | null>;
  writeFileIfMissing(filePath: string, content: Buffer): Promise<void>;
}
