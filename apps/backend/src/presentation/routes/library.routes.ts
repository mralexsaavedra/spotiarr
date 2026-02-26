import { Router, type Router as ExpressRouter } from "express";
import { container } from "../../container";
import { asyncHandler } from "../middleware/async-handler";

const router: ExpressRouter = Router();
const { libraryController } = container;

// GET /api/library/stats - Get library statistics
router.get("/stats", asyncHandler(libraryController.getStats));

// GET /api/library/artists - Get all artists (summary)
router.get("/artists", asyncHandler(libraryController.getArtists));

// GET /api/library/artists/:name - Get specific artist with albums and tracks
router.get("/artists/:name", asyncHandler(libraryController.getArtist));

// GET /api/library/image?path=...
router.get("/image", asyncHandler(libraryController.getImage));

// POST /api/library/scan - Trigger a manual library scan
router.post("/scan", asyncHandler(libraryController.scan));

export default router;
