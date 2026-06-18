import { Request, Response } from "express";
import type { LibraryAudioPort } from "@/application/ports/library-audio.port";
import type { LibraryImagePort } from "@/application/ports/library-image.port";
import { LibraryService } from "@/application/services/library.service";
import { logger } from "@/infrastructure/logging/logger";

export class LibraryController {
  constructor(
    private readonly libraryService: LibraryService,
    private readonly libraryAudioService: LibraryAudioPort,
    private readonly libraryImageService: LibraryImagePort,
  ) {}

  private parseRangeHeader(
    rangeHeader: string | undefined,
    fileSize: number,
  ):
    | { kind: "full" }
    | { kind: "partial"; start: number; end: number; chunkSize: number }
    | { kind: "invalid" } {
    if (!rangeHeader) {
      return { kind: "full" };
    }

    if (fileSize === 0) {
      return { kind: "invalid" };
    }

    const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
    if (!match) {
      return { kind: "invalid" };
    }

    const [, startRaw, endRaw] = match;
    if (startRaw === "" && endRaw === "") {
      return { kind: "invalid" };
    }

    if (startRaw === "") {
      const suffixLength = Number.parseInt(endRaw, 10);

      if (!Number.isFinite(suffixLength) || suffixLength <= 0) {
        return { kind: "invalid" };
      }

      const normalizedSuffixLength = Math.min(suffixLength, fileSize);
      const suffixStart = fileSize - normalizedSuffixLength;

      return {
        kind: "partial",
        start: suffixStart,
        end: fileSize - 1,
        chunkSize: normalizedSuffixLength,
      };
    }

    const start = Number.parseInt(startRaw, 10);
    const end = endRaw === "" ? fileSize - 1 : Number.parseInt(endRaw, 10);

    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      start < 0 ||
      end < start ||
      start >= fileSize
    ) {
      return { kind: "invalid" };
    }

    const normalizedEnd = Math.min(end, fileSize - 1);
    return {
      kind: "partial",
      start,
      end: normalizedEnd,
      chunkSize: normalizedEnd - start + 1,
    };
  }

  getStats = async (req: Request, res: Response) => {
    try {
      const stats = await this.libraryService.getStats();
      res.json({ data: stats });
    } catch (error) {
      logger.error({ component: "library-controller", err: error }, "Error getting library stats");
      res.status(500).json({
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Failed to get library stats",
      });
    }
  };

  getArtists = async (req: Request, res: Response) => {
    try {
      const artists = await this.libraryService.getArtists();
      res.json({ data: artists });
    } catch (error) {
      logger.error({ component: "library-controller", err: error }, "Error getting artists");
      res.status(500).json({
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Failed to get artists",
      });
    }
  };

  getArtist = async (req: Request, res: Response) => {
    try {
      const artistName = decodeURIComponent(req.params.name);
      const artist = await this.libraryService.getArtist(artistName);

      if (!artist) {
        res.status(404).json({
          error: "internal_server_error",
          message: "Artist not found",
        });
        return;
      }

      res.json({ data: artist });
    } catch (error) {
      logger.error({ component: "library-controller", err: error }, "Error getting artist");
      res.status(500).json({
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Failed to get artist",
      });
    }
  };

  getImage = async (req: Request, res: Response) => {
    try {
      const imagePath = typeof req.query.path === "string" ? req.query.path : undefined;
      const result = await this.libraryImageService.resolveImage(imagePath);

      if (result.kind === "reject") {
        if (result.reason === "missing-path") {
          res.status(400).json({
            error: "invalid_request",
            message: "Image path is required",
          });
          return;
        }

        res.status(404).json({
          error: "file_not_found",
          message: "File not found",
        });
        return;
      }

      res.type(result.contentType).sendFile(result.absolutePath, { dotfiles: "allow" }, (err) => {
        if (!err || res.headersSent) {
          return;
        }

        res.status(404).json({
          error: "file_not_found",
          message: "File not found",
        });
      });
    } catch (error) {
      logger.error({ component: "library-controller", err: error }, "Error serving image");
      res.status(500).json({
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Failed to serve image",
      });
    }
  };

  streamAudio = async (req: Request, res: Response) => {
    try {
      const audioPath = typeof req.query.path === "string" ? req.query.path : undefined;
      const result = await this.libraryAudioService.resolveAudio(audioPath);

      if (result.kind === "reject") {
        if (result.reason === "missing-path") {
          res.status(400).json({
            error: "invalid_request",
            message: "Audio path is required",
          });
          return;
        }

        res.status(404).json({ error: "file_not_found", message: "File not found" });
        return;
      }

      const range = this.parseRangeHeader(req.headers.range, result.sizeBytes);

      if (range.kind === "invalid") {
        res.setHeader("Content-Range", `bytes */${result.sizeBytes}`);
        res.status(416).json({ error: "invalid_range", message: "Range Not Satisfiable" });
        return;
      }

      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Content-Type", result.contentType);

      if (range.kind === "full") {
        res.setHeader("Content-Length", result.sizeBytes.toString());
        const stream = this.libraryAudioService.createAudioReadStream(result.absolutePath);
        stream.on("error", () => {
          if (!res.headersSent) {
            res.status(404).json({ error: "file_not_found", message: "File not found" });
          }
        });
        stream.pipe(res);
        return;
      }

      res.status(206);
      res.setHeader("Content-Range", `bytes ${range.start}-${range.end}/${result.sizeBytes}`);
      res.setHeader("Content-Length", range.chunkSize.toString());
      const stream = this.libraryAudioService.createAudioReadStream(result.absolutePath, {
        start: range.start,
        end: range.end,
      });
      stream.on("error", () => {
        if (!res.headersSent) {
          res.status(404).json({ error: "file_not_found", message: "File not found" });
        }
      });
      stream.pipe(res);
    } catch (error) {
      logger.error({ component: "library-controller", err: error }, "Error serving audio");
      res.status(500).json({
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Failed to serve audio",
      });
    }
  };

  scan = async (req: Request, res: Response) => {
    try {
      const result = await this.libraryService.scan();
      res.json({ data: result });
    } catch (error) {
      logger.error({ component: "library-controller", err: error }, "Error scanning library");
      res.status(500).json({
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Failed to scan library",
      });
    }
  };
}
