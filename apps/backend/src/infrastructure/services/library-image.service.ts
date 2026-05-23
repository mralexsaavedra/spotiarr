import fs from "node:fs/promises";
import path from "node:path";

export type RejectReason = "outside-root" | "bad-extension" | "not-found" | "missing-path";

export type ResolveImageResult =
  | { kind: "ok"; absolutePath: string; contentType: string }
  | { kind: "reject"; reason: RejectReason };

export interface LibraryImageService {
  resolveImage(rawPath: string | undefined): Promise<ResolveImageResult>;
}

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export class FileSystemLibraryImageService implements LibraryImageService {
  constructor(private readonly downloadsRoot: string) {}

  private logRejection(reason: RejectReason): void {
    console.warn("[LibraryImageService] Request rejected", { reason });
  }

  async resolveImage(rawPath: string | undefined): Promise<ResolveImageResult> {
    if (!rawPath) {
      this.logRejection("missing-path");
      return { kind: "reject", reason: "missing-path" };
    }

    let rootRealPath: string;
    let candidateRealPath: string;

    try {
      rootRealPath = await fs.realpath(this.downloadsRoot);
      candidateRealPath = await fs.realpath(rawPath);
    } catch {
      this.logRejection("not-found");
      return { kind: "reject", reason: "not-found" };
    }
    const extension = path.extname(candidateRealPath).toLowerCase();

    if (!Object.hasOwn(IMAGE_CONTENT_TYPES, extension)) {
      this.logRejection("bad-extension");
      return { kind: "reject", reason: "bad-extension" };
    }

    const relativePath = path.relative(rootRealPath, candidateRealPath);
    const isInsideRoot =
      relativePath.length > 0 && !relativePath.startsWith("..") && !path.isAbsolute(relativePath);

    if (!isInsideRoot) {
      this.logRejection("outside-root");
      return { kind: "reject", reason: "outside-root" };
    }

    return {
      kind: "ok",
      absolutePath: candidateRealPath,
      contentType: IMAGE_CONTENT_TYPES[extension],
    };
  }
}
