export interface ResolveImageResult {
  filePath: string;
  cacheControl: string;
}

export interface LibraryImagePort {
  resolveImage(rawPath: string | undefined): Promise<ResolveImageResult>;
}
