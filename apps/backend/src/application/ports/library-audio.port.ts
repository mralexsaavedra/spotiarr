import type { Readable } from "node:stream";

export type AudioRejectReason = "outside-root" | "bad-extension" | "not-found" | "missing-path";

export type AudioByteRange = { start: number; end: number };

export type ResolveAudioResult =
  | {
      kind: "ok";
      absolutePath: string;
      contentType: string;
      sizeBytes: number;
      mtimeMs: number;
      ino: number;
    }
  | { kind: "reject"; reason: AudioRejectReason };

export interface LibraryAudioPort {
  resolveAudio(rawPath: string | undefined): Promise<ResolveAudioResult>;
  createAudioReadStream(absolutePath: string, range?: AudioByteRange): Readable;
}
