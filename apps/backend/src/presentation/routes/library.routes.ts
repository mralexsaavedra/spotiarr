import { Router } from "express";
import type { LibraryService } from "@/application/services/library.service";

export function createLibraryRouter(libraryService: LibraryService): Router {
  const router = Router();

  // GET /api/library/stats - Get library statistics
  router.get("/stats", async (_req, res) => {
    try {
      const stats = await libraryService.getStats();
      res.json({ data: stats });
    } catch (error) {
      console.error("Error getting library stats:", error);
      res.status(500).json({
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Failed to get library stats",
      });
    }
  });

  // GET /api/library/artists - Get all artists (summary)
  router.get("/artists", async (_req, res) => {
    try {
      const artists = await libraryService.getArtists();
      res.json({ data: artists });
    } catch (error) {
      console.error("Error getting artists:", error);
      res.status(500).json({
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Failed to get artists",
      });
    }
  });

  // GET /api/library/artists/:name - Get specific artist with albums and tracks
  router.get("/artists/:name", async (req, res) => {
    try {
      const artistName = decodeURIComponent(req.params.name);
      const artist = await libraryService.getArtist(artistName);

      if (!artist) {
        res.status(404).json({
          error: "internal_server_error",
          message: "Artist not found",
        });
        return;
      }

      res.json({ data: artist });
    } catch (error) {
      console.error("Error getting artist:", error);
      res.status(500).json({
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Failed to get artist",
      });
    }
  });

  // GET /api/library/image?path=...
  router.get("/image", async (req, res) => {
    try {
      const imagePath = req.query.path as string;

      if (!imagePath) {
        res.status(400).json({
          error: "invalid_request",
          message: "Image path is required",
        });
        return;
      }

      res.sendFile(imagePath, (err) => {
        if (err) {
          console.error(`Error sending file ${imagePath}:`, err);
          if (!res.headersSent) {
            res.status(404).json({
              error: "file_not_found",
              message: "File not found",
            });
          }
        }
      });
    } catch (error) {
      console.error("Error serving image:", error);
      res.status(500).json({
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Failed to serve image",
      });
    }
  });

  // POST /api/library/scan - Trigger a manual library scan
  router.post("/scan", async (_req, res) => {
    try {
      const result = await libraryService.scan();
      res.json({ data: result });
    } catch (error) {
      console.error("Error scanning library:", error);
      res.status(500).json({
        error: "internal_server_error",
        message: error instanceof Error ? error.message : "Failed to scan library",
      });
    }
  });

  return router;
}
