import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import type {
  LibraryAudioPort,
  ResolveAudioResult,
  AudioRejectReason,
  AudioByteRange,
} from "@/application/ports/library-audio.port";
import { logger } from "@/infrastructure/logging/logger";

type DownloadsRootResolver = () => string;

const AUDIO_CONTENT_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".flac": "audio/flac",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".ogg": "audio/ogg",
  ".opus": "audio/ogg",
  ".wav": "audio/wav",
};

export class FileSystemLibraryAudioService implements LibraryAudioPort {
  private readonly resolveDownloadsRoot: DownloadsRootResolver;

  constructor(downloadsRootOrResolver: string | DownloadsRootResolver) {
    this.resolveDownloadsRoot =
      typeof downloadsRootOrResolver === "function"
        ? downloadsRootOrResolver
        : () => downloadsRootOrResolver;
  }

  private logRejection(reason: AudioRejectReason): void {
    logger.warn({ component: "library-audio-service", reason }, "Request rejected");
  }

  async resolveAudio(rawPath: string | undefined): Promise<ResolveAudioResult> {
    if (!rawPath) {
      this.logRejection("missing-path");
      return { kind: "reject", reason: "missing-path" };
    }

    let rootRealPath: string;
    let candidateRealPath: string;

    try {
      rootRealPath = await fs.realpath(this.resolveDownloadsRoot());
      candidateRealPath = await fs.realpath(rawPath);
    } catch {
      this.logRejection("not-found");
      return { kind: "reject", reason: "not-found" };
    }

    const extension = path.extname(candidateRealPath).toLowerCase();

    if (!Object.hasOwn(AUDIO_CONTENT_TYPES, extension)) {
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

    const stat = await fs.stat(candidateRealPath);

    return {
      kind: "ok",
      absolutePath: candidateRealPath,
      contentType: AUDIO_CONTENT_TYPES[extension],
      sizeBytes: stat.size,
    };
  }

  createAudioReadStream(absolutePath: string, range?: AudioByteRange) {
    if (!range) {
      return createReadStream(absolutePath);
    }

    return createReadStream(absolutePath, {
      start: range.start,
      end: range.end,
    });
  }
}
